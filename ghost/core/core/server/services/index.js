/* eslint-disable max-lines */
const errors = require('@tryghost/errors');

/** @type {readonly string[]} */
const AI_SERVICE_NAMES = [
    'ai-agent',
    'semantic-linker',
    'taxonomy-suggester',
    'content-gap',
    'audio-service',
    'style-guard',
    'content-repurpose',
    'editor-ai-tools',
    'site-manager'
];

/**
 * @param {string} name
 * @returns {object}
 */
function getServiceModule(name) {
    switch (name) {
    case 'ai-agent':
        return require('./ai-agent');
    case 'semantic-linker':
        return require('./semantic-linker');
    case 'taxonomy-suggester':
        return require('./taxonomy-suggester');
    case 'content-gap':
        return require('./content-gap');
    case 'audio-service':
        return require('./audio-service');
    case 'style-guard':
        return require('./style-guard');
    case 'content-repurpose':
        return require('./content-repurpose');
    case 'editor-ai-tools':
        return require('./editor-ai-tools');
    case 'site-manager':
        return require('./site-manager');
    default:
        return null;
    }
}

/**
 * Bootstrap custom AI-related services (graceful degradation per service).
 *
 * @param {object} deps
 * @param {object} deps.config - Ghost config (lazy-required path: ../../../shared/config)
 * @param {object} deps.models
 * @param {typeof import('@tryghost/logging')} deps.logging
 * @param {object} deps.aiConfig - Resolved AI config object from ai-config getConfig()
 */
async function initAiServices(deps) {
    const {logging} = deps;
    const ready = [];

    for (const name of AI_SERVICE_NAMES) {
        const mod = getServiceModule(name);
        if (!mod || typeof mod.init !== 'function') {
            logging.error({message: `[services] Missing or invalid service module: ${name}`});
            continue;
        }
        try {
            await mod.init(deps);
            if (typeof mod.isReady === 'function' && mod.isReady()) {
                ready.push(name);
            }
        } catch (err) {
            logging.error({err, message: `[services] ${name} init failed`});
        }
    }

    logging.info(`AI services initialized: [${ready.join(', ')}]`);
}

/**
 * Return the operational service instance (same object as legacy `SomeService.getService()`).
 *
 * @param {string} name
 * @returns {object}
 */
function getService(name) {
    const mod = getServiceModule(name);
    if (!mod) {
        throw new errors.NotFoundError({
            message: `Unknown service "${name}". Available services: ${[...AI_SERVICE_NAMES].sort().join(', ')}`
        });
    }
    if (typeof mod.getService !== 'function') {
        throw new errors.IncorrectUsageError({
            message: `Service "${name}" does not expose getService().`
        });
    }
    return mod.getService();
}

module.exports = {
    AI_SERVICE_NAMES,
    initAiServices,
    getService,
    getServiceModule
};
