'use strict';

/**
 * Sentry must load before other Ghost modules (see Sentry Express / Node docs).
 * Actual options live in `core/shared/sentry-setup.js` and Ghost config.
 */
require('./core/server/overrides');
require('./core/shared/sentry-setup').ensureSentryInitialized();
