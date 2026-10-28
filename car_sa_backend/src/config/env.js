/**
 * Loads settings for the chosen environment before anything else reads process.env.
 *
 *   APP_ENV=testing     -> .env.testing    (test database, test keys)
 *   APP_ENV=production  -> .env.production (live database)
 *   APP_ENV not set     -> .env only (unchanged behaviour)
 *
 * `.env` is always read last as a fallback; values already set are never overridden.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.join(__dirname, '..', '..');
const APP_ENV = String(process.env.APP_ENV || '').trim().toLowerCase();

if (APP_ENV) {
    const envFile = path.join(ROOT, `.env.${APP_ENV}`);
    if (!fs.existsSync(envFile)) {
        throw new Error(`APP_ENV is "${APP_ENV}" but ${envFile} does not exist. Copy .env.${APP_ENV}.example and fill it in.`);
    }
    dotenv.config({path: envFile, quiet: true});
}
dotenv.config({path: path.join(ROOT, '.env'), quiet: true});

const environment = APP_ENV || process.env.NODE_ENV || 'production';

// Guard: a testing server must never point at the live database.
if (environment === 'testing' && !/test/i.test(process.env.DB_NAME || '')) {
    throw new Error(`Refusing to start: APP_ENV=testing but DB_NAME "${process.env.DB_NAME}" does not contain "test". Use a separate test database.`);
}

module.exports = {environment};
