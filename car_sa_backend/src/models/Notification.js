const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');
const User = require('./User');
const CarRegisterRequest = require('./CarRegisterRequest');
const Service = require('./Service');
const {createHttpError} = require('../utils/httpError');
const PushDeviceToken = require('./PushDeviceToken');
const {sendNotificationToUser} = require('../utils/pushNotificationService');

const Notification = sequelize.define('Notification', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    user_id: {type: DataTypes.INTEGER, allowNull: false},
    type: {
        type: DataTypes.ENUM('car_register_request', 'service_request', 'system', 'other'),
        allowNull: false,
        defaultValue: 'other'
    },
    title: {type: DataTypes.STRING, allowNull: false},
    message: {type: DataTypes.TEXT, allowNull: false},
    read: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false},
    read_at: {type: DataTypes.DATE, allowNull: true},
    // Reference to related entity (e.g., car_register_request_id)
    related_entity_type: {type: DataTypes.STRING, allowNull: true}, // e.g., 'car_register_request', 'service_request'
    related_entity_id: {type: DataTypes.INTEGER, allowNull: true}, // ID of the related entity
    metadata: {type: DataTypes.JSON, allowNull: true}, // Additional data
}, {
    tableName: 'notifications',
    underscored: true,
});

Notification.belongsTo(User, {foreignKey: 'user_id', as: 'user'});
Notification.belongsTo(CarRegisterRequest, {foreignKey: 'related_entity_id', as: 'car_register_request', constraints: false});
Notification.belongsTo(Service, {foreignKey: 'related_entity_id', as: 'service', constraints: false});

Notification.getAllNotifications = async ({query, user}) => {
    const {read, type, limit = 50, offset = 0} = query || {};

    const whereClause = {
        user_id: user.id,
    };

    if (read !== undefined) {
        whereClause.read = read === 'true';
    }

    if (type) {
        whereClause.type = type;
    }

    const notifications = await Notification.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email'],
            },
        ],
    });

    const totalCount = await Notification.count({where: whereClause});
    const unreadCount = await Notification.count({
        where: {
            user_id: user.id,
            read: false,
        },
    });

    return {
        status: 200,
        data: {
            notifications,
            total: totalCount,
            unread: unreadCount,
        },
    };
};

Notification.getNotificationById = async ({params, user}) => {
    const {id} = params || {};
    const notification = await Notification.findByPk(id, {
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email'],
            },
        ],
    });

    if (!notification) {
        throw createHttpError('Notification not found', 404);
    }

    if (notification.user_id !== user.id) {
        throw createHttpError('You can only access your own notifications', 403);
    }

    return {
        status: 200,
        data: {notification},
    };
};

Notification.markAsReadById = async ({params, user}) => {
    const {id} = params || {};
    const notification = await Notification.findByPk(id);

    if (!notification) {
        throw createHttpError('Notification not found', 404);
    }

    if (notification.user_id !== user.id) {
        throw createHttpError('You can only update your own notifications', 403);
    }

    notification.read = true;
    notification.read_at = new Date();
    await notification.save();

    return {
        status: 200,
        data: {
            message: 'Notification marked as read',
            notification,
        },
    };
};

Notification.markAllAsReadForUser = async ({user}) => {
    const updated = await Notification.update(
        {
            read: true,
            read_at: new Date(),
        },
        {
            where: {
                user_id: user.id,
                read: false,
            },
        }
    );

    return {
        status: 200,
        data: {
            message: 'All notifications marked as read',
            updated_count: updated[0],
        },
    };
};

Notification.deleteNotificationById = async ({params, user}) => {
    const {id} = params || {};
    const notification = await Notification.findByPk(id);

    if (!notification) {
        throw createHttpError('Notification not found', 404);
    }

    if (notification.user_id !== user.id) {
        throw createHttpError('You can only delete your own notifications', 403);
    }

    await notification.destroy();

    return {
        status: 200,
        data: {
            message: 'Notification deleted successfully',
        },
    };
};

Notification.getUnreadCount = async ({user}) => {
    const count = await Notification.count({
        where: {
            user_id: user.id,
            read: false,
        },
    });

    return {
        status: 200,
        data: {
            unread_count: count,
        },
    };
};

Notification.dispatchPushForNotification = async (notification) => {
    if (!notification?.user_id) {
        return {sent_count: 0, failed_count: 0};
    }

    const tokens = await PushDeviceToken.findAll({
        where: {
            user_id: notification.user_id,
            active: true,
        },
        attributes: ['device_token'],
    });

    return sendNotificationToUser({
        notification,
        tokens: tokens.map((item) => item.device_token),
    });
};

Notification.createAndDispatch = async (values) => {
    const notification = await Notification.create(values);

    try {
        await Notification.dispatchPushForNotification(notification);
    } catch (error) {
        console.error('Error dispatching push notification:', error);
    }

    return notification;
};

module.exports = Notification;
