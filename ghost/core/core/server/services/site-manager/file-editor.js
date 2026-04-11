/**
 * File Editor
 *
 * Provides safe read/write/delete access to files within Ghost themes.
 * All operations are sandboxed to prevent path traversal attacks.
 */

const fs = require('fs-extra');
const path = require('path');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');

/**
 * File types that can be edited via the API
 */
const EDITABLE_EXTENSIONS = new Set([
    '.hbs', '.html', '.htm', '.css', '.js', '.json', '.yaml', '.yml',
    '.xml', '.txt', '.md', '.svg', '.toml'
]);

/**
 * Files/directories to exclude from listings
 */
const EXCLUDED_NAMES = new Set([
    'node_modules', '.git', '.DS_Store', 'Thumbs.db', '.env'
]);

/**
 * Resolve and validate a file path within a theme directory.
 * Prevents path traversal attacks.
 *
 * @param {string} themeName
 * @param {string} filePath — relative path within the theme
 * @returns {string} — absolute path to the file
 * @throws {BadRequestError} if the path escapes the theme directory
 */
function resolveThemePath(themeName, filePath) {
    const themesDir = config.getContentPath('themes');
    const themeDir = path.join(themesDir, themeName);
    const resolved = path.resolve(themeDir, filePath);

    // Security: ensure the resolved path is within the theme directory
    if (!resolved.startsWith(themeDir + path.sep) && resolved !== themeDir) {
        throw new errors.BadRequestError({
            message: 'Invalid file path: path traversal detected'
        });
    }

    return resolved;
}

/**
 * Get the theme directory path
 * @param {string} themeName
 * @returns {string}
 */
function getThemeDir(themeName) {
    return path.join(config.getContentPath('themes'), themeName);
}

/**
 * List all files in a theme directory (recursive)
 *
 * @param {string} themeName
 * @returns {Promise<Array<{path: string, name: string, type: string, size: number}>>}
 */
async function listFiles(themeName) {
    const themeDir = getThemeDir(themeName);

    if (!await fs.pathExists(themeDir)) {
        throw new errors.NotFoundError({
            message: `Theme not found: ${themeName}`
        });
    }

    const files = [];
    await walkDir(themeDir, themeDir, files);
    return files;
}

/**
 * Recursively walk a directory and collect file entries
 */
async function walkDir(dir, baseDir, results) {
    const entries = await fs.readdir(dir, {withFileTypes: true});

    for (const entry of entries) {
        if (EXCLUDED_NAMES.has(entry.name)) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
            results.push({
                path: relPath,
                name: entry.name,
                type: 'directory',
                size: 0
            });
            await walkDir(fullPath, baseDir, results);
        } else {
            const stat = await fs.stat(fullPath);
            const ext = path.extname(entry.name).toLowerCase();
            results.push({
                path: relPath,
                name: entry.name,
                type: 'file',
                size: stat.size,
                editable: EDITABLE_EXTENSIONS.has(ext),
                extension: ext
            });
        }
    }
}

/**
 * Read a file from a theme
 *
 * @param {string} themeName
 * @param {string} filePath — relative path within the theme
 * @returns {Promise<{content: string, path: string, editable: boolean}>}
 */
async function readFile(themeName, filePath) {
    const absolutePath = resolveThemePath(themeName, filePath);

    if (!await fs.pathExists(absolutePath)) {
        throw new errors.NotFoundError({
            message: `File not found: ${filePath}`
        });
    }

    const stat = await fs.stat(absolutePath);
    if (stat.isDirectory()) {
        throw new errors.BadRequestError({
            message: `Cannot read directory: ${filePath}`
        });
    }

    const ext = path.extname(filePath).toLowerCase();
    const editable = EDITABLE_EXTENSIONS.has(ext);

    if (!editable) {
        throw new errors.BadRequestError({
            message: `File type not supported for reading: ${ext}`
        });
    }

    const content = await fs.readFile(absolutePath, 'utf8');

    return {
        content,
        path: filePath,
        editable
    };
}

/**
 * Write/update a file in a theme
 *
 * @param {string} themeName
 * @param {string} filePath — relative path within the theme
 * @param {string} content — file content
 * @returns {Promise<{path: string, size: number}>}
 */
async function writeFile(themeName, filePath, content) {
    const absolutePath = resolveThemePath(themeName, filePath);

    const ext = path.extname(filePath).toLowerCase();
    if (!EDITABLE_EXTENSIONS.has(ext)) {
        throw new errors.BadRequestError({
            message: `File type not supported for editing: ${ext}`
        });
    }

    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(absolutePath));

    await fs.writeFile(absolutePath, content, 'utf8');

    const stat = await fs.stat(absolutePath);
    logging.info(`[site-manager:file-editor] Wrote ${filePath} in theme ${themeName} (${stat.size} bytes)`);

    return {
        path: filePath,
        size: stat.size
    };
}

/**
 * Delete a file from a theme
 *
 * @param {string} themeName
 * @param {string} filePath — relative path within the theme
 */
async function deleteFile(themeName, filePath) {
    const absolutePath = resolveThemePath(themeName, filePath);

    // Prevent deletion of required Ghost theme files
    const requiredFiles = ['index.hbs', 'post.hbs', 'package.json'];
    const baseName = path.basename(filePath);
    if (requiredFiles.includes(baseName) && path.dirname(filePath) === '.') {
        throw new errors.BadRequestError({
            message: `Cannot delete required theme file: ${baseName}`
        });
    }

    if (!await fs.pathExists(absolutePath)) {
        throw new errors.NotFoundError({
            message: `File not found: ${filePath}`
        });
    }

    await fs.remove(absolutePath);
    logging.info(`[site-manager:file-editor] Deleted ${filePath} from theme ${themeName}`);
}

module.exports = {
    listFiles,
    readFile,
    writeFile,
    deleteFile,
    getThemeDir,
    resolveThemePath
};
