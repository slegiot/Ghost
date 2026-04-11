/**
 * Site Manager Service
 *
 * Entry point for the universal website import/create/edit system.
 * Orchestrates the analyzer, transformer, scaffold, file editor, and registry
 * to provide a clean API for managing websites within Ghost.
 */

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const security = require('@tryghost/security');
const {extract} = require('@tryghost/zip');

const analyzer = require('./analyzer');
const transformer = require('./transformer');
const scaffold = require('./scaffold');
const fileEditor = require('./file-editor');
const siteRegistry = require('./site-registry');
const adapterRegistry = require('./adapters/registry');

// Ghost theme service — for installing transformed themes
const themeStorage = require('../themes/storage');
const themeLoader = require('../themes/loader');

/**
 * Initialize the site manager — register all adapters
 */
function init() {
    adapterRegistry.init();
    logging.info('[site-manager] Service initialized');
}

/**
 * Import a website from a ZIP file
 *
 * @param {Object} options
 * @param {string} options.path — path to the uploaded ZIP file
 * @param {string} options.originalname — original file name
 * @param {string} [options.displayName] — human-readable name
 * @returns {Promise<Object>} — the created site record with theme info
 */
async function importFromZip(options) {
    if (!options.path) {
        throw new errors.ValidationError({
            message: 'ZIP file path is required'
        });
    }

    logging.info(`[site-manager] Importing from ZIP: ${options.originalname}`);

    // 1. Extract ZIP to temp directory
    const extractDir = path.join(os.tmpdir(), `ghost-import-${security.identifier.uid(10)}`);
    await fs.ensureDir(extractDir);

    try {
        await extract(options.path, extractDir);

        // Handle nested directory (ZIP might contain a single root folder)
        const sourceDir = await findSourceRoot(extractDir);

        // 2. Determine display/theme names
        const baseName = options.originalname
            ? options.originalname.replace(/\.zip$/i, '')
            : 'imported-site';
        const displayName = options.displayName || baseName;

        // 3. Run the transform pipeline
        const result = await transformer.transformSite(sourceDir, {
            themeName: baseName,
            displayName
        });

        // 4. Install as a Ghost theme using existing theme infrastructure
        const zip = {
            path: await createThemeZip(result.themePath, result.themeName),
            name: `${result.themeName}.zip`
        };

        await themeStorage.setFromZip(zip);

        // 5. Register in site registry
        const site = await siteRegistry.addSite({
            themeName: result.themeName,
            displayName,
            framework: result.analysis.framework,
            confidence: result.analysis.confidence,
            adapterUsed: result.adapterUsed,
            source: {
                type: 'zip',
                originalName: options.originalname
            },
            details: result.analysis.details
        });

        // 6. Get file listing for the response
        const files = await fileEditor.listFiles(result.themeName);

        logging.info(`[site-manager] Import complete: ${result.themeName} (${result.analysis.framework})`);

        return {
            site,
            theme: result.themeName,
            framework: result.analysis.framework,
            confidence: result.analysis.confidence,
            adapter: result.adapterUsed,
            fileCount: files.length,
            files: files.slice(0, 50) // limit response size
        };
    } finally {
        // Clean up temp directories
        await fs.remove(extractDir).catch(() => {});
    }
}

/**
 * Create a new site from scratch
 *
 * @param {Object} options
 * @param {string} options.name — site name
 * @param {string} [options.displayName] — display name
 * @param {string} [options.layout='blog'] — layout type
 * @param {string} [options.primaryColor] — primary color hex
 * @param {string} [options.description] — site description
 * @returns {Promise<Object>}
 */
async function createSite(options) {
    logging.info(`[site-manager] Creating new site: ${options.name}`);

    // 1. Scaffold the theme
    const result = await scaffold.createSite(options);

    try {
        // 2. Install as Ghost theme
        const zip = {
            path: await createThemeZip(result.themePath, result.themeName),
            name: `${result.themeName}.zip`
        };

        await themeStorage.setFromZip(zip);

        // 3. Register in site registry
        const site = await siteRegistry.addSite({
            themeName: result.themeName,
            displayName: options.displayName || options.name,
            framework: 'scaffold',
            confidence: 1.0,
            adapterUsed: 'scaffold',
            source: {
                type: 'scaffold',
                layout: options.layout || 'blog'
            },
            details: {
                layout: options.layout || 'blog',
                primaryColor: options.primaryColor
            }
        });

        const files = await fileEditor.listFiles(result.themeName);

        return {
            site,
            theme: result.themeName,
            layout: options.layout || 'blog',
            fileCount: files.length,
            files: files.slice(0, 50)
        };
    } finally {
        await fs.remove(path.dirname(result.themePath)).catch(() => {});
    }
}

/**
 * List all managed sites
 */
async function listSites() {
    return await siteRegistry.listSites();
}

/**
 * Get a site's details including file tree
 */
async function getSite(siteId) {
    const site = await siteRegistry.getSite(siteId);

    let files = [];
    try {
        files = await fileEditor.listFiles(site.themeName);
    } catch (err) {
        logging.warn(`[site-manager] Could not list files for theme ${site.themeName}: ${err.message}`);
    }

    return {
        ...site,
        files
    };
}

/**
 * Delete a site and its theme
 */
async function deleteSite(siteId) {
    const site = await siteRegistry.getSite(siteId);

    // Delete the Ghost theme
    try {
        await themeStorage.destroy(site.themeName);
    } catch (err) {
        // Theme might already be deleted or is the active theme
        logging.warn(`[site-manager] Could not delete theme ${site.themeName}: ${err.message}`);
    }

    // Remove from registry
    await siteRegistry.removeSite(siteId);

    return site;
}

/**
 * Read a file from a site's theme
 */
async function readFile(siteId, filePath) {
    const site = await siteRegistry.getSite(siteId);
    return await fileEditor.readFile(site.themeName, filePath);
}

/**
 * Write/update a file in a site's theme
 */
async function writeFile(siteId, filePath, content) {
    const site = await siteRegistry.getSite(siteId);
    const result = await fileEditor.writeFile(site.themeName, filePath, content);

    // Update the site's updatedAt timestamp
    await siteRegistry.updateSite(siteId, {});

    // If the theme is active, trigger a reload
    const settingsCache = require('../../../shared/settings-cache');
    if (site.themeName === settingsCache.get('active_theme')) {
        try {
            await themeLoader.loadOneTheme(site.themeName);
            logging.info(`[site-manager] Reloaded active theme after file edit: ${site.themeName}`);
        } catch (err) {
            logging.warn(`[site-manager] Could not reload theme: ${err.message}`);
        }
    }

    return result;
}

/**
 * Delete a file from a site's theme
 */
async function deleteFile(siteId, filePath) {
    const site = await siteRegistry.getSite(siteId);
    await fileEditor.deleteFile(site.themeName, filePath);
    await siteRegistry.updateSite(siteId, {});
}

/**
 * Get available site layouts
 */
function getLayouts() {
    return scaffold.getLayouts();
}

/**
 * Get available adapters
 */
function getAdapters() {
    return adapterRegistry.listAdapters();
}

// --- Helpers ---

/**
 * Find the actual source root in an extracted ZIP
 * (handles case where ZIP contains a single top-level directory)
 */
async function findSourceRoot(extractDir) {
    const entries = await fs.readdir(extractDir, {withFileTypes: true});

    // Filter out hidden files and macOS artifacts
    const meaningful = entries.filter((e) => {
        return !e.name.startsWith('.') && e.name !== '__MACOSX';
    });

    // If there's exactly one directory and no files, descend into it
    if (meaningful.length === 1 && meaningful[0].isDirectory()) {
        return path.join(extractDir, meaningful[0].name);
    }

    return extractDir;
}

/**
 * Create a ZIP from a theme directory (for passing to Ghost's theme installer)
 */
async function createThemeZip(themePath, themeName) {
    const {compress} = require('@tryghost/zip');
    const zipDir = path.join(os.tmpdir(), `ghost-theme-zip-${security.identifier.uid(10)}`);
    const zipPath = path.join(zipDir, `${themeName}.zip`);

    await fs.ensureDir(zipDir);
    await compress(themePath, zipPath);

    return zipPath;
}

module.exports = {
    init,
    importFromZip,
    createSite,
    listSites,
    getSite,
    deleteSite,
    readFile,
    writeFile,
    deleteFile,
    getLayouts,
    getAdapters
};
