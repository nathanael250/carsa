const {createHttpError} = require('./httpError');

const PAYMENT_BASE_URL = (process.env.TRANSPIP_PAYMENTS_URL || 'https://payments.transpip.com').replace(/\/+$/, '');
const PAYMENT_REQUEST_TIMEOUT_MS = Number(process.env.TRANSPIP_PAYMENT_TIMEOUT_MS || 15000);

function requirePaymentConfig() {
    const commonApiKey = process.env.TRANSPIP_COMMON_API_KEY || process.env.TRANSPIP_API_KEY;
    const tenantApiKey = process.env.TRANSPIP_TENANT_API_KEY;

    if (!commonApiKey) {
        throw createHttpError('Payment common API key is not configured', 500);
    }
    if (!tenantApiKey) {
        throw createHttpError('Payment tenant API key is not configured', 500);
    }

    return {commonApiKey, tenantApiKey};
}

async function paymentCommand(command, payload) {
    const {commonApiKey, tenantApiKey} = requirePaymentConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAYMENT_REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${PAYMENT_BASE_URL}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-command': command,
                'x-api-key': commonApiKey,
            },
            body: JSON.stringify({
                apiKey: tenantApiKey,
                ...payload,
            }),
            signal: controller.signal,
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw createHttpError(data.error || data.message || `Payment request failed with status ${response.status}`, response.status);
        }
        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw createHttpError('Payment provider request timed out', 504);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function initiateCollection(payload) {
    return paymentCommand('COL_INIT_8A9B', payload);
}

async function checkCollectionStatus(collectionId) {
    return paymentCommand('COL_STATUS_9C0D', {collectionId});
}

module.exports = {
    initiateCollection,
    checkCollectionStatus,
};
