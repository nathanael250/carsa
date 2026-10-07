const {DataTypes, Op} = require('sequelize');
const {sequelize} = require('../config/database');
const User = require('./User');
const Garage = require('./Garage');
const Vehicle = require('./Vehicle');
const ServiceCatalog = require('./ServiceCatalog');
const OilProduct = require('./OilProduct');
const {createHttpError} = require('../utils/httpError');
const {resolveAccessibleGarageIds} = require('../utils/garageAccess');
const {initiateCollection, checkCollectionStatus} = require('../utils/transpipPayments');

const Service = sequelize.define('Service', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    vehicle_id: {type: DataTypes.INTEGER, allowNull: false},
    garage_id: {type: DataTypes.INTEGER, allowNull: false},
    service_catalog_id: {type: DataTypes.INTEGER, allowNull: false},
    performed_by_user_id: {type: DataTypes.INTEGER, allowNull: false}, // Garage admin/service technician who performed the service
    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'in_progress'
    },
    notes: {type: DataTypes.TEXT, allowNull: true}, // Additional notes from garage owner
    scheduled_date: {type: DataTypes.DATE, allowNull: true}, // When the service is scheduled
    started_at: {type: DataTypes.DATE, allowNull: true}, // When the service was started
    completed_at: {type: DataTypes.DATE, allowNull: true}, // When the service was completed
    estimated_cost: {type: DataTypes.DECIMAL(10, 2), allowNull: true}, // Estimated cost
    actual_cost: {type: DataTypes.DECIMAL(10, 2), allowNull: true}, // Actual cost after service
    mileage_at_service: {type: DataTypes.INTEGER, allowNull: true}, // Vehicle mileage when service was performed
    next_service_mileage: {type: DataTypes.INTEGER, allowNull: true}, // Worker-entered mileage for the next service reminder
    oil_product_id: {type: DataTypes.INTEGER, allowNull: true},
    payment_collection_id: {type: DataTypes.STRING(100), allowNull: true},
    payment_status: {type: DataTypes.ENUM('QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED'), allowNull: true},
    payment_phone: {type: DataTypes.STRING(30), allowNull: true},
    payment_amount: {type: DataTypes.INTEGER, allowNull: true},
    payment_provider_ref: {type: DataTypes.STRING(100), allowNull: true},
    payment_fail_reason: {type: DataTypes.TEXT, allowNull: true},
    paid_at: {type: DataTypes.DATE, allowNull: true},
}, {
    tableName: 'services',
    underscored: true,
});

Service.belongsTo(User, {foreignKey: 'performed_by_user_id', as: 'performed_by'});
Service.belongsTo(Garage, {foreignKey: 'garage_id', as: 'garage'});
Service.belongsTo(Vehicle, {foreignKey: 'vehicle_id', as: 'vehicle'});
Service.belongsTo(ServiceCatalog, {foreignKey: 'service_catalog_id', as: 'service_catalog'});
Service.belongsTo(OilProduct, {foreignKey: 'oil_product_id', as: 'oil_product'});

const serviceCatalogAttributes = [
    'id',
    'name',
    'description',
    'interval_type',
    'recommended_interval_days',
    'recommended_interval_km',
    'service_kind',
];

const oilProductAttributes = ['id', 'name', 'brand', 'grade', 'category', 'description'];
const TERMINAL_PAYMENT_STATUSES = ['SUCCESS', 'FAILED'];

function normalizePaymentStatus(status) {
    return status ? String(status).trim().toUpperCase() : null;
}

function getPaymentCollectionId(data) {
    return data?.collectionId || data?.collection_id || data?.id || data?.data?.collectionId || data?.data?.collection_id;
}

function getPaymentStatus(data) {
    return normalizePaymentStatus(data?.status || data?.data?.status || data?.collection?.status);
}

function updateServicePaymentFromStatus(service, data) {
    const status = getPaymentStatus(data);
    if (status) {
        if (service.payment_status === 'SUCCESS' && status !== 'SUCCESS') {
            return;
        }
        service.payment_status = status;
    }
    service.payment_provider_ref = data?.providerRef || data?.provider_ref || data?.data?.providerRef || data?.data?.provider_ref || service.payment_provider_ref;
    service.payment_fail_reason = data?.failReason || data?.fail_reason || data?.data?.failReason || data?.data?.fail_reason || service.payment_fail_reason;
    if (status === 'SUCCESS' && !service.paid_at) {
        service.paid_at = new Date();
    }
}

async function assertCanManageServicePayment(service, user) {
    if (user.role === 'car_owner') {
        throw createHttpError('Car owners cannot manage service payments. Please contact the garage.', 403);
    }
    if (user.role === 'garage_admin' || user.role === 'service_technician') {
        const accessibleGarageIds = await resolveAccessibleGarageIds(user);
        if (!accessibleGarageIds.includes(Number(service.garage_id))) {
            throw createHttpError('You can only manage payments for your garage', 403);
        }
    }
}

function resolveServiceKind(serviceCatalog) {
    const explicitKind = serviceCatalog?.service_kind;
    if (explicitKind) {
        return explicitKind;
    }

    const serviceName = String(serviceCatalog?.name || '').toLowerCase();
    if (!serviceName.includes('oil')) {
        return null;
    }
    if (serviceName.includes('gear')) {
        return 'gearbox_oil_change';
    }
    if (serviceName.includes('transmission')) {
        return 'transmission_oil_change';
    }
    return 'engine_oil_change';
}

const serviceInclude = [
    {model: Vehicle, as: 'vehicle', include: [{model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phone']}]},
    {model: Garage, as: 'garage', attributes: ['id', 'name', 'address', 'city']},
    {model: ServiceCatalog, as: 'service_catalog', attributes: serviceCatalogAttributes},
    {model: OilProduct, as: 'oil_product', attributes: oilProductAttributes},
    {model: User, as: 'performed_by', attributes: ['id', 'name', 'email']},
];

Service.createService = async ({body, user}) => {
    const {
        vehicle_id,
        service_catalog_id,
        notes,
        scheduled_date,
        estimated_cost,
        mileage_at_service,
        next_service_mileage,
        oil_product_id,
    } = body || {};

    if (!vehicle_id || !service_catalog_id) {
        throw createHttpError('vehicle_id and service_catalog_id are required', 400);
    }

    const vehicle = await Vehicle.findByPk(vehicle_id, {
        include: [{model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phone']}],
    });
    if (!vehicle) {
        throw createHttpError('Vehicle not found', 404);
    }

    const serviceCatalog = await ServiceCatalog.findByPk(service_catalog_id);
    if (!serviceCatalog) {
        throw createHttpError('Service catalog item not found', 404);
    }

    const serviceKind = resolveServiceKind(serviceCatalog);
    const requiresOilProduct = serviceKind &&
        ['engine_oil_change', 'gearbox_oil_change', 'transmission_oil_change'].includes(serviceKind);

    let oilProduct = null;
    if (oil_product_id) {
        oilProduct = await OilProduct.findByPk(oil_product_id);
        if (!oilProduct) {
            throw createHttpError('Oil product not found', 404);
        }
    }

    if (requiresOilProduct && !oilProduct) {
        throw createHttpError('oil_product_id is required for oil change services', 400);
    }

    let resolvedGarageId = body.garage_id;
    if ((user?.role === 'garage_admin' || user?.role === 'service_technician') && !resolvedGarageId) {
        if (user.role === 'garage_admin') {
            const garage = await Garage.findOne({where: {owner_user_id: user.id}});
            if (garage) {
                resolvedGarageId = garage.id;
            } else if (user.garage_id) {
                resolvedGarageId = user.garage_id;
            }
        } else if (user.role === 'service_technician') {
            resolvedGarageId = user.garage_id;
        }
    }

    if (!resolvedGarageId) {
        throw createHttpError('garage_id is required', 400);
    }

    const garage = await Garage.findByPk(resolvedGarageId);
    if (!garage) {
        throw createHttpError('Garage not found', 404);
    }

    const now = new Date();

    const service = await Service.create({
        vehicle_id,
        garage_id: resolvedGarageId,
        service_catalog_id,
        performed_by_user_id: user.id,
        status: 'in_progress',
        notes,
        scheduled_date: scheduled_date ? new Date(scheduled_date) : null,
        started_at: now,
        completed_at: null,
        estimated_cost,
        mileage_at_service,
        next_service_mileage,
        oil_product_id: oilProduct?.id || null,
    });

    try {
        const Notification = require('./Notification');
        await Notification.createAndDispatch({
            user_id: vehicle.owner_id,
            type: 'service_request',
            title: 'Service Started',
            message: `${garage.name} started ${serviceCatalog.name} for your vehicle (${vehicle.license_plate}).`,
            read: false,
            related_entity_type: 'service',
            related_entity_id: service.id,
            metadata: {
                garage_name: garage.name,
                service_name: serviceCatalog.name,
                license_plate: vehicle.license_plate,
                vehicle_id: vehicle.id,
                estimated_cost: estimated_cost,
                scheduled_date: scheduled_date,
                started_at: now,
                mileage_at_service,
                next_service_mileage,
                oil_product: oilProduct ? {
                    id: oilProduct.id,
                    name: oilProduct.name,
                    brand: oilProduct.brand,
                    grade: oilProduct.grade,
                    category: oilProduct.category,
                } : null,
            },
        });
    } catch (notifError) {
        console.error('Error creating notification:', notifError);
    }

    const createdService = await Service.findByPk(service.id, {
        include: serviceInclude,
    });

    return {
        status: 201,
        data: {
            message: 'Service created as in progress. Complete payment before marking it completed.',
            service: createdService,
        },
    };
};

Service.getAllServices = async ({query, user}) => {
    const {
        status,
        vehicle_id,
        garage_id,
        service_catalog_id,
        mechanic_id,
        service_technician_id,
        license_plate,
        date_from,
        date_to,
        limit = 50,
        offset = 0,
    } = query || {};
    const requestingUserId = user.id;
    const requestingUserRole = user.role;

    const whereClause = {};

    if (status) {
        whereClause.status = status;
    }

    if (requestingUserRole === 'car_owner') {
        const userVehicles = await Vehicle.findAll({
            where: {owner_id: requestingUserId},
            attributes: ['id'],
        });
        const vehicleIds = userVehicles.map(v => v.id);
        whereClause.vehicle_id = vehicleIds.length > 0 ? vehicleIds : [-1];
    } else if (requestingUserRole === 'garage_admin' || requestingUserRole === 'service_technician') {
        const accessibleGarageIds = await resolveAccessibleGarageIds(user);
        const garageIdFilter = garage_id ? Number(garage_id) : null;

        if (accessibleGarageIds.length === 0) {
            whereClause.garage_id = -1;
        } else if (garageIdFilter) {
            if (!accessibleGarageIds.includes(garageIdFilter)) {
                throw createHttpError('You can only view services for your own garages', 403);
            }
            whereClause.garage_id = garageIdFilter;
        } else if (accessibleGarageIds.length === 1) {
            whereClause.garage_id = accessibleGarageIds[0];
        } else {
            whereClause.garage_id = {[Op.in]: accessibleGarageIds};
        }

        if (vehicle_id) {
            whereClause.vehicle_id = vehicle_id;
        }
    } else if (requestingUserRole === 'super_admin') {
        if (vehicle_id) {
            whereClause.vehicle_id = vehicle_id;
        }
        if (garage_id) {
            whereClause.garage_id = garage_id;
        }
    }

    if (service_catalog_id) {
        whereClause.service_catalog_id = service_catalog_id;
    }

    const performerId = service_technician_id || mechanic_id;
    if (performerId) {
        whereClause.performed_by_user_id = performerId;
    }

    if (date_from || date_to) {
        whereClause.created_at = {};
        if (date_from) {
            whereClause.created_at[Op.gte] = new Date(date_from);
        }
        if (date_to) {
            whereClause.created_at[Op.lte] = new Date(date_to);
        }
    }

    const vehicleWhere = {};
    if (license_plate) {
        vehicleWhere.license_plate = {[Op.iLike]: `%${license_plate}%`};
    }

    const services = await Service.findAll({
        where: whereClause,
        include: [
            {model: Vehicle, as: 'vehicle', where: vehicleWhere, required: Object.keys(vehicleWhere).length > 0, include: [{model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phone']}]},
            {model: Garage, as: 'garage', attributes: ['id', 'name', 'address', 'city']},
            {model: ServiceCatalog, as: 'service_catalog', attributes: serviceCatalogAttributes},
            {model: OilProduct, as: 'oil_product', attributes: oilProductAttributes},
            {model: User, as: 'performed_by', attributes: ['id', 'name', 'email']},
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
    });

    const totalCount = await Service.count({
        where: whereClause,
        include: [
            {
                model: Vehicle,
                as: 'vehicle',
                where: vehicleWhere,
                required: Object.keys(vehicleWhere).length > 0,
            },
        ],
    });

    return {
        status: 200,
        data: {
            services,
            total: totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
        },
    };
};

Service.getServiceById = async ({params, user}) => {
    const {id} = params || {};
    const requestingUserId = user.id;
    const requestingUserRole = user.role;

    const service = await Service.findByPk(id, {
        include: serviceInclude,
    });

    if (!service) {
        throw createHttpError('Service not found', 404);
    }

    if (requestingUserRole === 'car_owner') {
        if (service.vehicle.owner_id !== requestingUserId) {
            throw createHttpError('You can only access services for your own vehicles', 403);
        }
    } else if (requestingUserRole === 'garage_admin' || requestingUserRole === 'service_technician') {
        const accessibleGarageIds = await resolveAccessibleGarageIds(user);
        if (!accessibleGarageIds.includes(Number(service.garage_id))) {
            throw createHttpError('You can only access services for your garage', 403);
        }
    }

    return {
        status: 200,
        data: {service},
    };
};

Service.getServicesByOwner = async ({params, query, user}) => {
    const {owner_id} = params || {};
    const {status, limit = 50, offset = 0} = query || {};
    const requestingUserId = user.id;
    const requestingUserRole = user.role;

    const owner = await User.findByPk(owner_id);
    if (!owner) {
        throw createHttpError('Car owner not found', 404);
    }

    if (requestingUserRole === 'car_owner') {
        if (parseInt(owner_id) !== requestingUserId) {
            throw createHttpError('You can only view services for your own vehicles', 403);
        }
    }

    const vehicles = await Vehicle.findAll({
        where: {owner_id: owner_id},
        attributes: ['id'],
    });
    const vehicleIds = vehicles.map(v => v.id);

    if (vehicleIds.length === 0) {
        return {
            status: 200,
            data: {
                owner: {
                    id: owner.id,
                    name: owner.name,
                    email: owner.email,
                    phone: owner.phone,
                },
                services: [],
                total: 0,
                limit: parseInt(limit),
                offset: parseInt(offset),
            },
        };
    }

    const whereClause = {vehicle_id: vehicleIds};
    if (status) {
        whereClause.status = status;
    }

    const services = await Service.findAll({
        where: whereClause,
        include: serviceInclude,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
    });

    const totalCount = await Service.count({where: whereClause});

    return {
        status: 200,
        data: {
            owner: {
                id: owner.id,
                name: owner.name,
                email: owner.email,
                phone: owner.phone,
            },
            services,
            total: totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
        },
    };
};

Service.getServicesByVehicle = async ({params, query, user}) => {
    const {vehicle_id} = params || {};
    const {status, limit = 50, offset = 0} = query || {};
    const requestingUserId = user.id;
    const requestingUserRole = user.role;

    const vehicle = await Vehicle.findByPk(vehicle_id, {
        include: [{model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phone']}],
    });
    if (!vehicle) {
        throw createHttpError('Vehicle not found', 404);
    }

    if (requestingUserRole === 'car_owner') {
        if (vehicle.owner_id !== requestingUserId) {
            throw createHttpError('You can only view services for your own vehicles', 403);
        }
    }

    const whereClause = {vehicle_id: vehicle_id};
    if (status) {
        whereClause.status = status;
    }

    const services = await Service.findAll({
        where: whereClause,
        include: serviceInclude,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
    });

    const totalCount = await Service.count({where: whereClause});

    return {
        status: 200,
        data: {
            vehicle: {
                id: vehicle.id,
                license_plate: vehicle.license_plate,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                owner: vehicle.owner,
            },
            services,
            total: totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
        },
    };
};

Service.updateService = async ({params, body, user}) => {
    const {id} = params || {};
    const {
        status,
        notes,
        scheduled_date,
        estimated_cost,
        actual_cost,
        mileage_at_service,
        next_service_mileage,
        oil_product_id,
    } = body || {};
    const requestingUserId = user.id;
    const requestingUserRole = user.role;

    const service = await Service.findByPk(id, {
        include: [
            {model: Vehicle, as: 'vehicle', include: [{model: User, as: 'owner'}]},
            {model: Garage, as: 'garage'},
            {model: ServiceCatalog, as: 'service_catalog', attributes: serviceCatalogAttributes},
            {model: OilProduct, as: 'oil_product', attributes: oilProductAttributes},
        ],
    });

    if (!service) {
        throw createHttpError('Service not found', 404);
    }

    if (oil_product_id !== undefined) {
        if (oil_product_id === null || oil_product_id === '') {
            service.oil_product_id = null;
        } else {
            const oilProduct = await OilProduct.findByPk(oil_product_id);
            if (!oilProduct) {
                throw createHttpError('Oil product not found', 404);
            }
            service.oil_product_id = oilProduct.id;
        }
    }

    const serviceKind = resolveServiceKind(service.service_catalog);
    const requiresOilProduct = serviceKind &&
        ['engine_oil_change', 'gearbox_oil_change', 'transmission_oil_change'].includes(serviceKind);
    if (requiresOilProduct && !service.oil_product_id) {
        throw createHttpError('oil_product_id is required for oil change services', 400);
    }

    if (requestingUserRole === 'car_owner') {
        throw createHttpError('Car owners cannot update services. Please contact the garage.', 403);
    } else if (requestingUserRole === 'garage_admin' || requestingUserRole === 'service_technician') {
        const accessibleGarageIds = await resolveAccessibleGarageIds(user);
        if (!accessibleGarageIds.includes(Number(service.garage_id))) {
            throw createHttpError('You can only update services for your garage', 403);
        }
    }

    if (status !== undefined) {
        if (status === 'completed' && service.payment_status !== 'SUCCESS') {
            throw createHttpError('Payment must be completed before this service can be marked completed.', 400);
        }
        service.status = status;
        if (status === 'in_progress' && !service.started_at) {
            service.started_at = new Date();
        }
        if (status === 'completed') {
            service.completed_at = new Date();
        }
    }
    if (notes !== undefined) service.notes = notes;
    if (scheduled_date !== undefined) service.scheduled_date = scheduled_date ? new Date(scheduled_date) : null;
    if (estimated_cost !== undefined) service.estimated_cost = estimated_cost;
    if (actual_cost !== undefined) service.actual_cost = actual_cost;
    if (mileage_at_service !== undefined) service.mileage_at_service = mileage_at_service;
    if (next_service_mileage !== undefined) service.next_service_mileage = next_service_mileage;

    await service.save();

    if (status === 'completed') {
        try {
            const Notification = require('./Notification');
            await Notification.update(
                {read: false},
                {
                    where: {
                        user_id: service.vehicle.owner_id,
                        related_entity_type: 'service',
                        related_entity_id: service.id,
                    },
                }
            );
        } catch (notifError) {
            console.error('Error updating notification:', notifError);
        }
    }

    const updatedService = await Service.findByPk(id, {
        include: serviceInclude,
    });

    return {
        status: 200,
        data: {
            message: 'Service updated successfully',
            service: updatedService,
        },
    };
};

Service.initiatePayment = async ({params, body, user}) => {
    const {id} = params || {};
    const {phone, amount} = body || {};

    if (!phone) {
        throw createHttpError('phone is required', 400);
    }

    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount < 100) {
        throw createHttpError('amount must be a whole number of at least 100 RWF', 400);
    }

    const service = await Service.findByPk(id, {include: serviceInclude});
    if (!service) {
        throw createHttpError('Service not found', 404);
    }

    await assertCanManageServicePayment(service, user);

    if (service.status === 'completed') {
        throw createHttpError('This service is already completed', 400);
    }

    if (service.payment_status === 'SUCCESS') {
        return {
            status: 200,
            data: {
                message: 'Service payment is already confirmed',
                service,
                collectionId: service.payment_collection_id,
                paymentStatus: service.payment_status,
            },
        };
    }

    const normalizedPhone = String(phone).trim();
    const isSamePendingPayment = service.payment_collection_id &&
        !TERMINAL_PAYMENT_STATUSES.includes(service.payment_status) &&
        Number(service.payment_amount) === parsedAmount &&
        String(service.payment_phone || '').trim() === normalizedPhone;

    if (isSamePendingPayment) {
        return {
            status: 200,
            data: {
                message: 'Service payment is already processing',
                service,
                collectionId: service.payment_collection_id,
                paymentStatus: service.payment_status,
            },
        };
    }

    const idempotencyKey = `service-${service.id}-${Date.now()}`;
    const owner = service.vehicle?.owner;
    const response = await initiateCollection({
        idempotencyKey,
        userPseudoId: `service-${service.id}`,
        phone: normalizedPhone,
        amount: parsedAmount,
        customerName: owner?.name,
        customerEmail: owner?.email,
    });

    const collectionId = getPaymentCollectionId(response);
    if (!collectionId) {
        throw createHttpError('Payment provider did not return a collectionId', 502);
    }

    service.payment_collection_id = collectionId;
    service.payment_status = getPaymentStatus(response) || 'PROCESSING';
    service.payment_phone = normalizedPhone;
    service.payment_amount = parsedAmount;
    service.payment_provider_ref = response.providerRef || response.provider_ref || service.payment_provider_ref;
    service.payment_fail_reason = null;
    service.actual_cost = parsedAmount;
    await service.save();

    const updatedService = await Service.findByPk(service.id, {include: serviceInclude});

    return {
        status: 200,
        data: {
            message: 'Payment collection initiated',
            service: updatedService,
            collectionId,
            paymentStatus: service.payment_status,
        },
    };
};

Service.checkPaymentStatus = async ({params, user}) => {
    const {id} = params || {};
    const service = await Service.findByPk(id, {include: serviceInclude});
    if (!service) {
        throw createHttpError('Service not found', 404);
    }

    await assertCanManageServicePayment(service, user);

    if (!service.payment_collection_id) {
        throw createHttpError('No payment collection has been started for this service', 400);
    }

    const response = await checkCollectionStatus(service.payment_collection_id);
    updateServicePaymentFromStatus(service, response);
    await service.save();

    const updatedService = await Service.findByPk(service.id, {include: serviceInclude});

    return {
        status: 200,
        data: {
            message: 'Payment status checked',
            service: updatedService,
            collectionId: service.payment_collection_id,
            paymentStatus: service.payment_status,
            providerRef: service.payment_provider_ref,
            failReason: service.payment_fail_reason,
        },
    };
};

Service.applyPaymentWebhook = async (payload) => {
    const collectionId = payload?.collectionId || payload?.collection_id;
    const status = getPaymentStatus(payload);

    if (!collectionId) {
        throw createHttpError('collectionId is required', 400);
    }
    if (!status || !TERMINAL_PAYMENT_STATUSES.includes(status)) {
        throw createHttpError('Webhook status must be SUCCESS or FAILED', 400);
    }

    const service = await Service.findOne({
        where: {payment_collection_id: collectionId},
    });

    if (!service) {
        return {
            matched: false,
            collectionId,
            paymentStatus: status,
        };
    }

    updateServicePaymentFromStatus(service, payload);
    await service.save();

    return {
        matched: true,
        serviceId: service.id,
        collectionId,
        paymentStatus: service.payment_status,
    };
};

module.exports = Service;
