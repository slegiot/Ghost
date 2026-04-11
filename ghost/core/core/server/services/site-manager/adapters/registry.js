/**
 * Adapter Registry
 *
 * Maintains a registry of framework adapters that can detect and transform
 * different types of websites into Ghost-compatible themes.
 *
 * Each adapter exports:
 *   - name: string — unique adapter identifier
 *   - detect(analysis): boolean — whether this adapter handles the given analysis
 *   - transform(sourceDir, targetDir, analysis): Promise<void> — transform the site
 */

const logging = require('@tryghost/logging');

/** @type {Map<string, import('./static-html')>} */
const adapters = new Map();

/**
 * Register an adapter
 * @param {Object} adapter
 * @param {string} adapter.name
 * @param {function} adapter.detect
 * @param {function} adapter.transform
 */
function register(adapter) {
    if (!adapter.name || !adapter.detect || !adapter.transform) {
        throw new Error(`Adapter must export name, detect, and transform. Got: ${Object.keys(adapter).join(', ')}`);
    }
    adapters.set(adapter.name, adapter);
    logging.info(`[site-manager] Registered adapter: ${adapter.name}`);
}

/**
 * Find the best adapter for an analysis result
 * @param {Object} analysis — output from analyzer.js
 * @returns {Object|null} the adapter, or null if none matches
 */
function findAdapter(analysis) {
    for (const adapter of adapters.values()) {
        if (adapter.detect(analysis)) {
            return adapter;
        }
    }
    return null;
}

/**
 * Get an adapter by name
 * @param {string} name
 * @returns {Object|null}
 */
function getAdapter(name) {
    return adapters.get(name) || null;
}

/**
 * List all registered adapter names
 * @returns {string[]}
 */
function listAdapters() {
    return Array.from(adapters.keys());
}

// Auto-register built-in adapters
function init() {
    register(require('./handlebars-adapter'));
    register(require('./spa'));
    register(require('./static-html'));
    logging.info(`[site-manager] ${adapters.size} adapters registered`);
}

module.exports = {
    register,
    findAdapter,
    getAdapter,
    listAdapters,
    init
};
