const assert = require('node:assert/strict');
const sinon = require('sinon');
const configUtils = require('../../utils/config-utils');
const errors = require('@tryghost/errors');

const Sentry = require('@sentry/node');

const fakeDSN = 'https://aaabbbccc000111222333444555667@sentry.io/1234567';
let sentry;

describe('UNIT: sentry', function () {
    afterEach(async function () {
        await configUtils.restore();
        sinon.restore();
        try {
            await Sentry.close(2000);
        } catch (e) {
            // ignore when client was never started
        }
        delete require.cache[require.resolve('../../../core/shared/sentry-setup')];
        delete require.cache[require.resolve('../../../core/shared/sentry')];
    });

    describe('No sentry config', function () {
        beforeEach(function () {
            // Override any real `config.local.json` Sentry settings during this describe
            configUtils.set({sentry: {disabled: true, dsn: undefined}});
            delete require.cache[require.resolve('../../../core/shared/sentry-setup')];
            delete require.cache[require.resolve('../../../core/shared/sentry')];
            sentry = require('../../../core/shared/sentry');
        });

        it('returns expected function signature', function () {
            assert.equal(sentry.requestHandler.name, 'expressNoop', 'Should return noop');
            assert.equal(sentry.errorHandler.name, 'expressNoop', 'Should return noop');
            assert.equal(sentry.captureException.name, 'noop', 'Should return noop');
        });
    });

    describe('With sentry config', function () {
        beforeEach(async function () {
            await Sentry.close(2000).catch(() => {});
            configUtils.set({sentry: {disabled: false, dsn: fakeDSN}});
            delete require.cache[require.resolve('../../../core/shared/sentry-setup')];
            delete require.cache[require.resolve('../../../core/shared/sentry')];

            sentry = require('../../../core/shared/sentry');
        });

        it('returns expected function signature', function () {
            assert.equal(sentry.requestHandler.name, 'sentryRequestMiddleware', 'Should return sentry');
            assert.equal(sentry.errorHandler.name, 'sentryErrorMiddleware', 'Should return sentry');
            assert.equal(sentry.captureException.name, 'captureException', 'Should return sentry');
        });

        it('initialises sentry correctly', function () {
            const client = Sentry.getCurrentHub().getClient();
            assert.ok(client, 'Sentry client should exist');
            assert.equal(client.getOptions().dsn, fakeDSN, 'should be our fake dsn');
            assert.match(client.getOptions().release, /ghost@\d+\.\d+\.\d+/, 'should be a valid version');
            assert.equal(client.getOptions().environment, 'testing', 'should be the testing env');
            assert.ok(Object.prototype.hasOwnProperty.call(client.getOptions(), 'beforeSend'), 'should have a beforeSend function');
        });

        it('initialises sentry with the correct environment', async function () {
            const env = 'staging';

            await Sentry.close(2000).catch(() => {});
            configUtils.set({
                sentry: {disabled: false, dsn: fakeDSN},
                PRO_ENV: env
            });

            delete require.cache[require.resolve('../../../core/shared/sentry-setup')];
            delete require.cache[require.resolve('../../../core/shared/sentry')];
            require('../../../core/shared/sentry');

            const client = Sentry.getCurrentHub().getClient();
            assert.ok(client);
            assert.equal(client.getOptions().environment, env, 'should be the correct env');
        });
    });

    describe('beforeSend', function () {
        this.beforeEach(function () {
            configUtils.set({sentry: {disabled: false, dsn: fakeDSN}});
            delete require.cache[require.resolve('../../../core/shared/sentry-setup')];
            delete require.cache[require.resolve('../../../core/shared/sentry')];

            sentry = require('../../../core/shared/sentry');
        });

        it('returns the event', function () {
            sinon.stub(errors.utils, 'isGhostError').returns(false);
            const beforeSend = sentry.beforeSend;
            const event = {tags: {}};
            const hint = {};

            const result = beforeSend(event, hint);

            assert.deepEqual(result, event);
        });

        it('returns the event, even if an exception is thrown internally', function () {
            // Trigger an internal exception
            sinon.stub(errors.utils, 'isGhostError').throws(new Error('test'));
            const beforeSend = sentry.beforeSend;
            const event = {tags: {}};
            const hint = {};

            const result = beforeSend(event, hint);

            assert.deepEqual(result, event);
        });

        it('sets sql context for mysql2 errors', function () {
            sinon.stub(errors.utils, 'isGhostError').returns(true);
            const beforeSend = sentry.beforeSend;
            const event = {
                tags: {},
                exception: {
                    values: [{
                        value: 'test',
                        type: 'test'
                    }]
                }
            };
            const exception = {
                sql: 'SELECT * FROM test',
                errno: 123,
                sqlErrorCode: 456,
                sqlMessage: 'test message',
                sqlState: 'test state',
                code: 'UNEXPECTED_ERROR',
                errorType: 'InternalServerError',
                id: 'a1b2c3d4e5f6',
                statusCode: 500
            };
            const hint = {
                originalException: exception
            };

            const result = beforeSend(event, hint);

            const expected = {
                tags: {
                    type: 'InternalServerError',
                    code: 'UNEXPECTED_ERROR',
                    id: 'a1b2c3d4e5f6',
                    status_code: 500
                },
                exception: {
                    values: [{
                        value: 'test message',
                        type: 'SQL Error 123: 456'
                    }]
                },
                contexts: {
                    mysql: {
                        errno: 123,
                        code: 456,
                        sql: 'SELECT * FROM test',
                        message: 'test message',
                        state: 'test state'
                    }
                }
            };

            assert.deepEqual(result, expected);
        });
    });

    describe('beforeSendTransaction', function () {
        it('filters transactions based on an allow list', function () {
            delete require.cache[require.resolve('../../../core/shared/sentry-setup')];
            delete require.cache[require.resolve('../../../core/shared/sentry')];
            sentry = require('../../../core/shared/sentry');

            const beforeSendTransaction = sentry.beforeSendTransaction;

            const allowedTransactions = [
                {transaction: 'GET /ghost/api/settings'},
                {transaction: 'PUT /members/api/member'},
                {transaction: 'POST /ghost/api/tiers'},
                {transaction: 'DELETE /members/api/member'},
                {transaction: 'GET /'},
                {transaction: 'GET /:slug/options(edit)?/'},
                {transaction: 'GET /author/:slug'},
                {transaction: 'GET /tag/:slug'}
            ];

            allowedTransactions.forEach((transaction) => {
                assert.equal(beforeSendTransaction(transaction), transaction);
            });

            assert.equal(beforeSendTransaction({transaction: 'GET /foo/bar'}), null);
            assert.equal(beforeSendTransaction({transaction: 'Some other transaction'}), null);
        });
    });
});
