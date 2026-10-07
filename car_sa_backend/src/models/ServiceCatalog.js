const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');
const {createHttpError} = require('../utils/httpError');

const ServiceCatalog = sequelize.define('ServiceCatalog', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING(150), allowNull: false},
    description: {type: DataTypes.TEXT, allowNull: true},
    interval_type: {
        type: DataTypes.ENUM('days', 'km'),
        allowNull: false
    },
    recommended_interval_days: {type: DataTypes.INTEGER, allowNull: true},
    recommended_interval_km: {type: DataTypes.INTEGER, allowNull: true},
    service_kind: {type: DataTypes.STRING(50), allowNull: true},
}, {
    tableName: 'service_catalog',
    underscored: true,
});

ServiceCatalog.createServiceCatalog = async ({body}) => {
    const {
        name,
        description,
        interval_type,
        recommended_interval_days,
        recommended_interval_km,
        service_kind,
    } = body || {};

    if (!name || !interval_type) {
        throw createHttpError('Name and interval_type are required fields', 400);
    }

    if (!['days', 'km'].includes(interval_type)) {
        throw createHttpError("interval_type must be either 'days' or 'km'", 400);
    }

    if (interval_type === 'days' && !recommended_interval_days) {
        throw createHttpError('recommended_interval_days is required when interval_type is "days"', 400);
    }

    if (interval_type === 'km' && !recommended_interval_km) {
        throw createHttpError('recommended_interval_km is required when interval_type is "km"', 400);
    }

    if (recommended_interval_days && (isNaN(recommended_interval_days) || recommended_interval_days <= 0)) {
        throw createHttpError('recommended_interval_days must be a positive integer', 400);
    }

    if (recommended_interval_km && (isNaN(recommended_interval_km) || recommended_interval_km <= 0)) {
        throw createHttpError('recommended_interval_km must be a positive integer', 400);
    }

    const service = await ServiceCatalog.create({
        name: name.trim(),
        description: description ? description.trim() : null,
        interval_type: interval_type,
        recommended_interval_days: interval_type === 'days' ? parseInt(recommended_interval_days) : null,
        recommended_interval_km: interval_type === 'km' ? parseInt(recommended_interval_km) : null,
        service_kind: service_kind ? String(service_kind).trim() : null,
    });

    return {
        status: 201,
        data: {
            message: 'Service catalog item created successfully',
            service: service,
        },
    };
};

ServiceCatalog.getAllServiceCatalogs = async ({query}) => {
    const {interval_type, page = 1, limit = 50} = query || {};

    const where = {};
    if (interval_type && ['days', 'km'].includes(interval_type)) {
        where.interval_type = interval_type;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitValue = parseInt(limit);

    const {count, rows: services} = await ServiceCatalog.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit: limitValue,
        offset: offset,
    });

    return {
        status: 200,
        data: {
            message: 'Services retrieved successfully',
            total: count,
            page: parseInt(page),
            limit: limitValue,
            total_pages: Math.ceil(count / limitValue),
            services,
        },
    };
};

ServiceCatalog.getServiceCatalogById = async ({params}) => {
    const {id} = params || {};

    const service = await ServiceCatalog.findByPk(id);

    if (!service) {
        throw createHttpError('Service catalog item not found', 404);
    }

    return {
        status: 200,
        data: {
            message: 'Service retrieved successfully',
            service,
        },
    };
};

ServiceCatalog.updateServiceCatalog = async ({params, body}) => {
    const {id} = params || {};
    const {
        name,
        description,
        interval_type,
        recommended_interval_days,
        recommended_interval_km,
        service_kind,
    } = body || {};

    const service = await ServiceCatalog.findByPk(id);
    if (!service) {
        throw createHttpError('Service catalog item not found', 404);
    }

    if (interval_type !== undefined) {
        if (!['days', 'km'].includes(interval_type)) {
            throw createHttpError("interval_type must be either 'days' or 'km'", 400);
        }
        service.interval_type = interval_type;

        if (interval_type === 'days') {
            service.recommended_interval_km = null;
            if (recommended_interval_days !== undefined) {
                const daysValue = parseInt(recommended_interval_days);
                if (isNaN(daysValue) || daysValue <= 0) {
                    throw createHttpError('recommended_interval_days must be a positive integer', 400);
                }
                service.recommended_interval_days = daysValue;
            } else if (!service.recommended_interval_days) {
                throw createHttpError('recommended_interval_days is required when interval_type is "days"', 400);
            }
        } else if (interval_type === 'km') {
            service.recommended_interval_days = null;
            if (recommended_interval_km !== undefined) {
                const kmValue = parseInt(recommended_interval_km);
                if (isNaN(kmValue) || kmValue <= 0) {
                    throw createHttpError('recommended_interval_km must be a positive integer', 400);
                }
                service.recommended_interval_km = kmValue;
            } else if (!service.recommended_interval_km) {
                throw createHttpError('recommended_interval_km is required when interval_type is "km"', 400);
            }
        }
    } else {
        if (recommended_interval_days !== undefined) {
            if (service.interval_type === 'days') {
                const daysValue = parseInt(recommended_interval_days);
                if (isNaN(daysValue) || daysValue <= 0) {
                    throw createHttpError('recommended_interval_days must be a positive integer', 400);
                }
                service.recommended_interval_days = daysValue;
            } else {
                throw createHttpError('Cannot set recommended_interval_days when interval_type is "km"', 400);
            }
        }

        if (recommended_interval_km !== undefined) {
            if (service.interval_type === 'km') {
                const kmValue = parseInt(recommended_interval_km);
                if (isNaN(kmValue) || kmValue <= 0) {
                    throw createHttpError('recommended_interval_km must be a positive integer', 400);
                }
                service.recommended_interval_km = kmValue;
            } else {
                throw createHttpError('Cannot set recommended_interval_km when interval_type is "days"', 400);
            }
        }
    }

    if (name !== undefined) service.name = name.trim();
    if (description !== undefined) service.description = description ? description.trim() : null;
    if (service_kind !== undefined) service.service_kind = service_kind ? String(service_kind).trim() : null;

    await service.save();

    return {
        status: 200,
        data: {
            message: 'Service catalog item updated successfully',
            service: service,
        },
    };
};

ServiceCatalog.deleteServiceCatalog = async ({params}) => {
    const {id} = params || {};

    const service = await ServiceCatalog.findByPk(id);
    if (!service) {
        throw createHttpError('Service catalog item not found', 404);
    }

    await service.destroy();

    return {
        status: 200,
        data: {
            message: 'Service catalog item deleted successfully',
            deleted_id: id,
        },
    };
};

module.exports = ServiceCatalog;
