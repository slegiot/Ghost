/**
 * Transformer
 *
 * Orchestrates the end-to-end pipeline: analyze → find adapter → transform → validate.
 * Takes a source directory (extracted ZIP or local path) and produces a Ghost theme.
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const security = require('@tryghost/security');

const analyzer = require('./analyzer');
const adapterRegistry = require('./adapters/registry');

/**
 * @typedef {Object} TransformResult
 * @property {string} themeName — name for the Ghost theme
 * @property {string} themePath — path to the generated theme directory
 * @property {Object} analysis — the analyzer output
 * @property {string} adapterUsed — name of the adapter that performed the transform
 */

/**
 * Transform a source directory into a Ghost-compatible theme
 *
 * @param {string} sourceDir — path to the source website files
 * @param {Object} [options]
 * @param {string} [options.themeName] — override the theme name
 * @param {string} [options.displayName] — human-readable name
 * @returns {Promise<TransformResult>}
 */
async function transformSite(sourceDir, options = {}) {
    // 1. Verify source exists
    const exists = await fs.pathExists(sourceDir);
    if (!exists) {
        throw new errors.NotFoundError({
            message: `Source directory not found: ${sourceDir}`
        });
    }

    // 2. Analyze the source
    const analysis = await analyzer.analyze(sourceDir);

    if (options.themeName) {
        analysis.themeName = analyzer.sanitizeName(options.themeName);
    }
    if (options.displayName) {
        analysis.displayName = options.displayName;
    }

    logging.info(`[site-manager:transformer] Analysis: framework=${analysis.framework}, confidence=${analysis.confidence}`);

    // 3. Find the right adapter
    const adapter = adapterRegistry.findAdapter(analysis);

    if (!adapter) {
        // Fall back to static-html if we have HTML files
        const staticAdapter = adapterRegistry.getAdapter('static-html');
        if (staticAdapter && analysis.files.some((f) => {
            return f.endsWith('.html') || f.endsWith('.htm');
        })) {
            logging.warn(`[site-manager:transformer] No specific adapter for '${analysis.framework}', falling back to static-html`);
            analysis.framework = 'static-html';
            return await runTransform(staticAdapter, sourceDir, analysis);
        }

        throw new errors.ValidationError({
            message: `No adapter found for framework: ${analysis.framework}. Supported: ${adapterRegistry.listAdapters().join(', ')}`
        });
    }

    return await runTransform(adapter, sourceDir, analysis);
}

/**
 * Run the transformation with a specific adapter
 */
async function runTransform(adapter, sourceDir, analysis) {
    // Create a temporary target directory
    const targetDir = path.join(
        os.tmpdir(),
        `ghost-site-${security.identifier.uid(10)}`,
        analysis.themeName
    );
    await fs.ensureDir(targetDir);

    try {
        // Run the adapter transformation
        await adapter.transform(sourceDir, targetDir, analysis);

        // Verify the output has required files
        await validateThemeOutput(targetDir, analysis.themeName);

        logging.info(`[site-manager:transformer] Transform complete: ${analysis.themeName} at ${targetDir}`);

        return {
            themeName: analysis.themeName,
            themePath: targetDir,
            analysis,
            adapterUsed: adapter.name
        };
    } catch (err) {
        // Clean up on failure
        await fs.remove(path.dirname(targetDir)).catch(() => {});
        throw err;
    }
}

/**
 * Validate that the transformed output is a valid Ghost theme
 */
async function validateThemeOutput(targetDir, themeName) {
    const requiredFiles = ['index.hbs', 'post.hbs', 'package.json'];
    const missingFiles = [];

    for (const file of requiredFiles) {
        const filePath = path.join(targetDir, file);
        const fileExists = await fs.pathExists(filePath);
        if (!fileExists) {
            missingFiles.push(file);
        }
    }

    if (missingFiles.length > 0) {
        throw new errors.ValidationError({
            message: `Transformed theme '${themeName}' is missing required files: ${missingFiles.join(', ')}`
        });
    }

    // Validate package.json is valid JSON
    try {
        await fs.readJson(path.join(targetDir, 'package.json'));
    } catch {
        throw new errors.ValidationError({
            message: `Transformed theme '${themeName}' has invalid package.json`
        });
    }
}

module.exports = {
    transformSite
};
