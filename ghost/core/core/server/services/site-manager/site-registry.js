/**
 * Site Registry
 *
 * Persists site metadata to a JSON file at content/data/sites.json.
 * Tracks all imported/created sites and their relationship to Ghost themes.
 */

const fs = require('fs-extra');
const path = require('path');
const ObjectID = require('bson-objectid').default;
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const config = require('../../../shared/config');

/**
 * @typedef {Object} SiteRecord
 * @property {string} id — unique site ID
 * @property {string} themeName — corresponding Ghost theme name
 * @property {string} displayName — human-readable name
 * @property {string} framework — detected framework type
 * @property {number} confidence — detection confidence (0-1)
 * @property {string} adapterUsed — adapter that transformed the site
 * @property {Object} source — import source information
 * @property {string} source.type — 'zip', 'scaffold', 'filesystem'
 * @property {string} [source.originalName] — original file/folder name
 * @property {string} createdAt — ISO date string
 * @property {string} updatedAt — ISO date string
 * @property {Object} [details] — analysis details
 */

let registryCache = null;

/**
 * Get the path to the sites.json registry file
 */
function getRegistryPath() {
    return path.join(config.getContentPath('data'), 'sites.json');
}

/**
 * Load the registry from disk (or return cached version)
 * @returns {Promise<{sites: SiteRecord[]}>}
 */
async function load() {
    if (registryCache) {
        return registryCache;
    }

    const registryPath = getRegistryPath();

    try {
        if (await fs.pathExists(registryPath)) {
            registryCache = await fs.readJson(registryPath);
        } else {
            registryCache = {sites: []};
        }
    } catch (err) {
        logging.error(`[site-manager:registry] Failed to load registry: ${err.message}`);
        registryCache = {sites: []};
    }

    return registryCache;
}

/**
 * Save the registry to disk
 */
async function save() {
    const registryPath = getRegistryPath();
    await fs.ensureDir(path.dirname(registryPath));
    await fs.writeJson(registryPath, registryCache, {spaces: 2});
}

/**
 * Add a new site record
 * @param {Partial<SiteRecord>} siteData
 * @returns {Promise<SiteRecord>}
 */
async function addSite(siteData) {
    await load();

    const record = {
        id: new ObjectID().toHexString(),
        themeName: siteData.themeName,
        displayName: siteData.displayName || siteData.themeName,
        framework: siteData.framework || 'unknown',
        confidence: siteData.confidence || 0,
        adapterUsed: siteData.adapterUsed || 'unknown',
        source: siteData.source || {type: 'unknown'},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        details: siteData.details || {}
    };

    registryCache.sites.push(record);
    await save();

    logging.info(`[site-manager:registry] Added site: ${record.displayName} (${record.id})`);
    return record;
}

/**
 * Get all sites
 * @returns {Promise<SiteRecord[]>}
 */
async function listSites() {
    const registry = await load();
    return registry.sites;
}

/**
 * Get a single site by ID
 * @param {string} siteId
 * @returns {Promise<SiteRecord>}
 */
async function getSite(siteId) {
    const registry = await load();
    const site = registry.sites.find((s) => {
        return s.id === siteId;
    });

    if (!site) {
        throw new errors.NotFoundError({
            message: `Site not found: ${siteId}`
        });
    }

    return site;
}

/**
 * Update a site record
 * @param {string} siteId
 * @param {Partial<SiteRecord>} updates
 * @returns {Promise<SiteRecord>}
 */
async function updateSite(siteId, updates) {
    const registry = await load();
    const index = registry.sites.findIndex((s) => {
        return s.id === siteId;
    });

    if (index === -1) {
        throw new errors.NotFoundError({
            message: `Site not found: ${siteId}`
        });
    }

    registry.sites[index] = {
        ...registry.sites[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    await save();
    return registry.sites[index];
}

/**
 * Remove a site record
 * @param {string} siteId
 * @returns {Promise<SiteRecord>}
 */
async function removeSite(siteId) {
    const registry = await load();
    const index = registry.sites.findIndex((s) => {
        return s.id === siteId;
    });

    if (index === -1) {
        throw new errors.NotFoundError({
            message: `Site not found: ${siteId}`
        });
    }

    const removed = registry.sites.splice(index, 1)[0];
    await save();

    logging.info(`[site-manager:registry] Removed site: ${removed.displayName} (${removed.id})`);
    return removed;
}

/**
 * Find a site by theme name
 * @param {string} themeName
 * @returns {Promise<SiteRecord|null>}
 */
async function findByThemeName(themeName) {
    const registry = await load();
    const site = registry.sites.find((s) => {
        return s.themeName === themeName;
    });
    return site || null;
}

/**
 * Clear the in-memory cache (useful for testing)
 */
function clearCache() {
    registryCache = null;
}

module.exports = {
    addSite,
    listSites,
    getSite,
    updateSite,
    removeSite,
    findByThemeName,
    clearCache
};
