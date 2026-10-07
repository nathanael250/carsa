const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');
const User = require('./User');
const {createHttpError} = require('../utils/httpError');

const PushDeviceToken = sequelize.define('PushDeviceToken', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    user_id: {type: DataTypes.INTEGER, allowNull: false},
    device_token: {type: DataTypes.STRING(512), allowNull: false},
    platform: {
        type: DataTypes.ENUM('android', 'ios', 'web', 'unknown'),
        allowNull: false,
        defaultValue: 'unknown',
    },
    device_id: {type: DataTypes.STRING, allowNull: true},
    active: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true},
    last_seen_at: {type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW},
}, {
    tableName: 'push_device_tokens',
    underscored: true,
    indexes: [
        {fields: ['user_id']},
        {unique: true, fields: ['device_token']},
    ],
});

PushDeviceToken.belongsTo(User, {foreignKey: 'user_id', as: 'user'});
User.hasMany(PushDeviceToken, {foreignKey: 'user_id', as: 'push_devices'});

PushDeviceToken.registerToken = async ({body, user}) => {
    const {device_token, platform = 'unknown', device_id} = body || {};

    if (!device_token || !String(device_token).trim()) {
        throw createHttpError('device_token is required', 400);
    }

    const normalizedToken = String(device_token).trim();
    const normalizedPlatform = ['android', 'ios', 'web'].includes(platform)
        ? platform
        : 'unknown';

    const [record] = await PushDeviceToken.findOrCreate({
        where: {device_token: normalizedToken},
        defaults: {
            user_id: user.id,
            device_token: normalizedToken,
            platform: normalizedPlatform,
            device_id: device_id || null,
            active: true,
            last_seen_at: new Date(),
        },
    });

    if (record.user_id !== user.id
        || record.platform !== normalizedPlatform
        || record.device_id !== (device_id || null)
        || !record.active) {
        record.user_id = user.id;
        record.platform = normalizedPlatform;
        record.device_id = device_id || null;
        record.active = true;
        record.last_seen_at = new Date();
        await record.save();
    } else {
        record.last_seen_at = new Date();
        await record.save();
    }

    return {
        status: 200,
        data: {
            message: 'Push device token registered successfully',
            push_device_token: record,
        },
    };
};

PushDeviceToken.unregisterToken = async ({body, user}) => {
    const {device_token} = body || {};

    if (!device_token || !String(device_token).trim()) {
        throw createHttpError('device_token is required', 400);
    }

    const record = await PushDeviceToken.findOne({
        where: {
            user_id: user.id,
            device_token: String(device_token).trim(),
        },
    });

    if (!record) {
        return {
            status: 200,
            data: {
                message: 'Push device token already removed',
            },
        };
    }

    record.active = false;
    record.last_seen_at = new Date();
    await record.save();

    return {
        status: 200,
        data: {
            message: 'Push device token unregistered successfully',
        },
    };
};

module.exports = PushDeviceToken;
