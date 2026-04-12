'use strict';

const config = require('./config');
const Sentry = require('@sentry/node');
const SentryKnexTracingIntegration = require('./sentry-knex-tracing-integration');

let _errors;

/**
 * @param {import('@sentry/node').Event} event
 * @param {import('@sentry/node').EventHint} hint
 * @returns {import('@sentry/node').Event | null}
 */
const beforeSend = function (event, hint) {
    try {
        const errors = _errors || (_errors = require('@tryghost/errors'));
        const exception = hint.originalException;
        const code = exception?.code ?? null;
        const context = exception?.context ?? null;
        const errorType = exception?.errorType ?? null;
        const id = exception?.id ?? null;
        const statusCode = exception?.statusCode ?? null;
        event.tags = event.tags || {};

        if (errors.utils.isGhostError(exception)) {
            if (code === 'UNEXPECTED_ERROR' && context !== null) {
                if (event.exception.values?.length > 0) {
                    event.exception.values[0].type = context;
                }
            }

            if (exception.sql) {
                const sql = exception.sql;
                const errno = exception.errno ?? null;
                const sqlErrorCode = exception.sqlErrorCode ?? null;
                const sqlMessage = exception.sqlMessage ?? null;
                const sqlState = exception.sqlState ?? null;

                if (event.exception.values?.length > 0) {
                    event.exception.values[0].type = `SQL Error ${errno}: ${sqlErrorCode}`;
                    event.exception.values[0].value = sqlMessage;
                    event.contexts = event.contexts || {};
                    event.contexts.mysql = {
                        errno: errno,
                        code: sqlErrorCode,
                        sql: sql,
                        message: sqlMessage,
                        state: sqlState
                    };
                }
            }

            event.tags.type = errorType;
            event.tags.code = code;
            event.tags.id = id;
            event.tags.status_code = statusCode;

            if (statusCode === 500) {
                return event;
            }
            return null;
        }
        return event;
    } catch (error) {
        return event;
    }
};

const ALLOWED_HTTP_TRANSACTIONS = [
    '/ghost/api',
    '/members/api',
    '/:slug',
    '/author',
    '/tag'
].map((path) => {
    return new RegExp(`^(GET|POST|PUT|DELETE)\\s(?<path>${path}\\/.+|\\/$)`);
});

/**
 * @param {import('@sentry/node').Event} event
 * @returns {import('@sentry/node').Event | null}
 */
const beforeSendTransaction = function (event) {
    for (const transaction of ALLOWED_HTTP_TRANSACTIONS) {
        const match = event.transaction.match(transaction);

        if (match?.groups?.path) {
            return event;
        }
    }

    return null;
};

/**
 * @returns {import('@sentry/node').NodeOptions | null}
 */
function buildSentryInitOptions() {
    const sentryConfig = config.get('sentry');
    if (!sentryConfig || sentryConfig.disabled || !sentryConfig.dsn) {
        return null;
    }

    const version = require('@tryghost/version').full;

    let environment = config.get('PRO_ENV');
    if (!environment) {
        environment = config.get('env');
    }

    /** @type {import('@sentry/node').NodeOptions} */
    const sentryInitConfig = {
        dsn: sentryConfig.dsn,
        release: 'ghost@' + version,
        environment: environment,
        maxValueLength: 1000,
        sendDefaultPii: true,
        integrations: [
            Sentry.extraErrorDataIntegration()
        ],
        beforeSend,
        beforeSendTransaction
    };

    if (sentryConfig.tracing?.enabled === true) {
        sentryInitConfig.integrations.push(new Sentry.Integrations.Http({tracing: true}));
        sentryInitConfig.tracesSampleRate = parseFloat(sentryConfig.tracing.sampleRate) || 1.0;
    } else {
        sentryInitConfig.tracesSampleRate = 0;
    }

    return sentryInitConfig;
}

function ensureSentryInitialized() {
    const existing = Sentry.getCurrentHub().getClient();
    // After `Sentry.close()`, the hub may still hold a disabled client — allow re-init
    if (existing && existing.getOptions().enabled !== false) {
        return;
    }

    const opts = buildSentryInitOptions();
    if (!opts) {
        return;
    }

    Sentry.init(opts);
}

/**
 * @param {import('knex').Knex} knex
 */
function initQueryTracing(knex) {
    const sentryConfig = config.get('sentry');
    if (!sentryConfig || sentryConfig.disabled || !sentryConfig.dsn) {
        return;
    }
    if (sentryConfig.tracing?.enabled === true) {
        const integration = new SentryKnexTracingIntegration(knex);
        Sentry.addIntegration(integration);
    }
}

module.exports = {
    ensureSentryInitialized,
    initQueryTracing,
    beforeSend,
    beforeSendTransaction
};
