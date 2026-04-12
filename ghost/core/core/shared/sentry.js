const setup = require('./sentry-setup');

// In case anything required `sentry` before `instrument.js` ran (e.g. some tests)
setup.ensureSentryInitialized();

const Sentry = require('@sentry/node');

const expressNoop = function expressNoop(req, res, next) {
    next();
};

const noop = function noop() {};

const client = Sentry.getCurrentHub().getClient();
if (client && client.getOptions().enabled !== false) {
    module.exports = {
        requestHandler: Sentry.Handlers.requestHandler(),
        errorHandler: Sentry.Handlers.errorHandler(),
        tracingHandler: Sentry.Handlers.tracingHandler(),
        captureException: Sentry.captureException,
        captureMessage: Sentry.captureMessage,
        beforeSend: setup.beforeSend,
        beforeSendTransaction: setup.beforeSendTransaction,
        initQueryTracing: setup.initQueryTracing
    };
} else {
    module.exports = {
        requestHandler: expressNoop,
        errorHandler: expressNoop,
        tracingHandler: expressNoop,
        captureException: noop,
        captureMessage: noop,
        beforeSend: setup.beforeSend,
        beforeSendTransaction: setup.beforeSendTransaction,
        initQueryTracing: noop
    };
}
