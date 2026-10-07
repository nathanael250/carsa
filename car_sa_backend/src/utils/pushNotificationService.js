let firebaseApp = null;
let firebaseAdmin = null;
let firebaseAdminLoadAttempted = false;

function getFirebaseAdmin() {
    if (firebaseAdminLoadAttempted) {
        return firebaseAdmin;
    }

    firebaseAdminLoadAttempted = true;

    try {
        firebaseAdmin = require('firebase-admin');
    } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') {
            console.error('Failed to load firebase-admin:', error);
        }
        firebaseAdmin = null;
    }

    return firebaseAdmin;
}

function readServiceAccount() {
    const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (rawJson && rawJson.trim()) {
        return JSON.parse(rawJson);
    }

    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (base64 && base64.trim()) {
        const decoded = Buffer.from(base64, 'base64').toString('utf8');
        return JSON.parse(decoded);
    }

    return null;
}

function getFirebaseApp() {
    if (firebaseApp) {
        return firebaseApp;
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
        return null;
    }

    const serviceAccount = readServiceAccount();
    if (!serviceAccount) {
        return null;
    }

    firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    return firebaseApp;
}

function isPushEnabled() {
    return Boolean(getFirebaseApp());
}

async function sendNotificationToUser({notification, tokens}) {
    if (!notification || !Array.isArray(tokens) || tokens.length === 0) {
        return {sent_count: 0, failed_count: 0};
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
        return {sent_count: 0, failed_count: 0, skipped: true};
    }

    const app = getFirebaseApp();
    if (!app) {
        return {sent_count: 0, failed_count: 0, skipped: true};
    }

    const cleanTokens = tokens.filter(Boolean);
    if (cleanTokens.length === 0) {
        return {sent_count: 0, failed_count: 0};
    }

    const messaging = admin.messaging(app);
    const message = {
        tokens: cleanTokens,
        notification: {
            title: notification.title,
            body: notification.message,
        },
        data: {
            notification_id: String(notification.id),
            type: String(notification.type || ''),
            related_entity_type: String(notification.related_entity_type || ''),
            related_entity_id: notification.related_entity_id != null
                ? String(notification.related_entity_id)
                : '',
        },
        android: {
            priority: 'high',
            notification: {
                channelId: 'carsa_general',
                sound: 'default',
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                },
            },
        },
    };

    const response = await messaging.sendEachForMulticast(message);

    const invalidTokens = [];
    response.responses.forEach((item, index) => {
        if (item.success) {
            return;
        }

        const code = item.error?.code || '';
        if (
            code.includes('registration-token-not-registered')
            || code.includes('invalid-registration-token')
        ) {
            invalidTokens.push(cleanTokens[index]);
        }
    });

    if (invalidTokens.length > 0) {
        try {
            const PushDeviceToken = require('../models/PushDeviceToken');
            await PushDeviceToken.update(
                {active: false, last_seen_at: new Date()},
                {where: {device_token: invalidTokens}},
            );
        } catch (error) {
            console.error('Failed to deactivate invalid push tokens', error);
        }
    }

    return {
        sent_count: response.successCount,
        failed_count: response.failureCount,
    };
}

module.exports = {
    isPushEnabled,
    sendNotificationToUser,
};
