const express = require('express');
const Service = require('../models/Service');
const {handleError} = require('../utils/controllerHelpers');

const router = express.Router();

function getProvidedSecret(req) {
    return req.headers['x-webhook-secret'] || req.headers['x-transpip-webhook-secret'] || req.query.token;
}

router.post('/transpip/webhook', async (req, res) => {
    try {
        const expectedSecret = process.env.TRANSPIP_WEBHOOK_SECRET;
        if (expectedSecret) {
            const providedSecret = getProvidedSecret(req);
            if (!providedSecret || providedSecret !== expectedSecret) {
                return res.status(401).json({error: 'Invalid webhook secret'});
            }
        }

        const result = await Service.applyPaymentWebhook(req.body || {});
        return res.status(200).json({
            received: true,
            ...result,
        });
    } catch (error) {
        return handleError(res, error);
    }
});

module.exports = router;
