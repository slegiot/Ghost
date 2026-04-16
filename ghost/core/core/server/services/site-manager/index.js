/* eslint-disable max-lines */
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

const {assertServiceReady} = require('../ai-service-utils');
const transformer = require('./transformer');
const scaffold = require('./scaffold');
const fileEditor = require('./file-editor');
const siteRegistry = require('./site-registry');
const adapterRegistry = require('./adapters/registry');

// Ghost theme service — for installing transformed themes
const themeStorage = require('../themes/storage');
const themeLoader = require('../themes/loader');

/** @type {typeof logging} */
let log = logging;

const service = module.exports = {
    name: 'site-manager',
    _initialized: false,
    settingsCache: null,

    /**
     * @param {object} ctx
     * @param {import('../../../shared/config')} ctx.config
     * @param {object} ctx.models
     * @param {typeof import('@tryghost/logging')} ctx.logging
     * @param {object} ctx.aiConfig
     */
    async init(ctx) {
        try {
            log = ctx.logging;
            this.settingsCache = require('../../../shared/settings-cache');
            adapterRegistry.init();
            log.info('[site-manager] Service initialized');
            this._initialized = true;
        } catch (err) {
            ctx.logging.error({err, message: '[site-manager] init failed'});
            this.settingsCache = null;
            this._initialized = false;
        }
    },

    isReady() {
        return this._initialized === true;
    },

    getService() {
        assertServiceReady(service.name, service.isReady());
        return service;
    },

    /**
     * @param {Object} options
     * @param {string} options.path
     * @param {string} options.originalname
     * @param {string} [options.displayName]
     */
    async importFromZip(options) {
        assertServiceReady(service.name, service.isReady());
        if (!options.path) {
            throw new errors.ValidationError({
                message: 'ZIP file path is required'
            });
        }

        log.info(`[site-manager] Importing from ZIP: ${options.originalname}`);

        const extractDir = path.join(os.tmpdir(), `ghost-import-${security.identifier.uid(10)}`);
        await fs.ensureDir(extractDir);

        try {
            await extract(options.path, extractDir);

            const sourceDir = await findSourceRoot(extractDir);

            const baseName = options.originalname
                ? options.originalname.replace(/\.zip$/i, '')
                : 'imported-site';
            const displayName = options.displayName || baseName;

            const result = await transformer.transformSite(sourceDir, {
                themeName: baseName,
                displayName
            });

            const zip = {
                path: await createThemeZip(result.themePath, result.themeName),
                name: `${result.themeName}.zip`
            };

            await themeStorage.setFromZip(zip);

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

            const files = await fileEditor.listFiles(result.themeName);

            log.info(`[site-manager] Import complete: ${result.themeName} (${result.analysis.framework})`);

            return {
                site,
                theme: result.themeName,
                framework: result.analysis.framework,
                confidence: result.analysis.confidence,
                adapter: result.adapterUsed,
                fileCount: files.length,
                files: files.slice(0, 50)
            };
        } finally {
            await fs.remove(extractDir).catch(() => {});
        }
    },

    /**
     * @param {Object} options
     * @param {string} options.name
     */
    async createSite(options) {
        assertServiceReady(service.name, service.isReady());
        log.info(`[site-manager] Creating new site: ${options.name}`);

        const result = await scaffold.createSite(options);

        try {
            const zip = {
                path: await createThemeZip(result.themePath, result.themeName),
                name: `${result.themeName}.zip`
            };

            await themeStorage.setFromZip(zip);

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
    },

    async listSites() {
        assertServiceReady(service.name, service.isReady());
        return await siteRegistry.listSites();
    },

    async getSite(siteId) {
        assertServiceReady(service.name, service.isReady());
        const site = await siteRegistry.getSite(siteId);

        let files = [];
        try {
            files = await fileEditor.listFiles(site.themeName);
        } catch (err) {
            log.warn(`[site-manager] Could not list files for theme ${site.themeName}: ${err.message}`);
        }

        return {
            ...site,
            files
        };
    },

    async deleteSite(siteId) {
        assertServiceReady(service.name, service.isReady());
        const site = await siteRegistry.getSite(siteId);

        try {
            await themeStorage.destroy(site.themeName);
        } catch (err) {
            log.warn(`[site-manager] Could not delete theme ${site.themeName}: ${err.message}`);
        }

        await siteRegistry.removeSite(siteId);

        return site;
    },

    async readFile(siteId, filePath) {
        assertServiceReady(service.name, service.isReady());
        const site = await siteRegistry.getSite(siteId);
        return await fileEditor.readFile(site.themeName, filePath);
    },

    async writeFile(siteId, filePath, content) {
        assertServiceReady(service.name, service.isReady());
        const site = await siteRegistry.getSite(siteId);
        const result = await fileEditor.writeFile(site.themeName, filePath, content);

        await siteRegistry.updateSite(siteId, {});

        if (service.settingsCache && site.themeName === service.settingsCache.get('active_theme')) {
            try {
                await themeLoader.loadOneTheme(site.themeName);
                log.info(`[site-manager] Reloaded active theme after file edit: ${site.themeName}`);
            } catch (err) {
                log.warn(`[site-manager] Could not reload theme: ${err.message}`);
            }
        }

        return result;
    },

    async deleteFile(siteId, filePath) {
        assertServiceReady(service.name, service.isReady());
        const site = await siteRegistry.getSite(siteId);
        await fileEditor.deleteFile(site.themeName, filePath);
        await siteRegistry.updateSite(siteId, {});
    },

    getLayouts() {
        assertServiceReady(service.name, service.isReady());
        return scaffold.getLayouts();
    },

    getAdapters() {
        assertServiceReady(service.name, service.isReady());
        return adapterRegistry.listAdapters();
    }
};

/**
 * Find the actual source root in an extracted ZIP
 */
async function findSourceRoot(extractDir) {
    const entries = await fs.readdir(extractDir, {withFileTypes: true});

    const meaningful = entries.filter((e) => {
        return !e.name.startsWith('.') && e.name !== '__MACOSX';
    });

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
