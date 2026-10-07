const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');
const User = require('./User');
const Garage = require('./Garage');
const Vehicle = require('./Vehicle');
const {createHttpError} = require('../utils/httpError');
const {verifyCode} = require('../utils/tokenUtils');
const {sendCarRegisterRequestEmail} = require('../utils/emailService');

const CarRegisterRequest = sequelize.define('CarRegisterRequest', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    user_id: {type: DataTypes.INTEGER, allowNull: false},
    garage_id: {type: DataTypes.INTEGER, allowNull: false},
    requested_by_user_id: {type: DataTypes.INTEGER, allowNull: false}, // The garage admin/service technician who requested
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'rejected', 'expired'),
        allowNull: false,
        defaultValue: 'pending'
    },
    expires_at: {type: DataTypes.DATE, allowNull: true},
    verification_code: {type: DataTypes.STRING, allowNull: true}, // 6-digit code sent to car owner
    verification_code_hash: {type: DataTypes.STRING, allowNull: true}, // Hashed code for verification
    code_verified: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false}, // Whether code was verified
    vehicle_data: {type: DataTypes.JSON, allowNull: true}, // Store vehicle info to register after confirmation
}, {
    tableName: 'car_register_requests',
    underscored: true,
});

CarRegisterRequest.belongsTo(User, {foreignKey: 'user_id', as: 'user'});
CarRegisterRequest.belongsTo(Garage, {foreignKey: 'garage_id', as: 'garage'});

CarRegisterRequest.createRequest = async ({body, user}) => {
    const {user_id, vehicle_data, garage_id} = body || {};

    if (!user_id || !vehicle_data || !vehicle_data.license_plate) {
        throw createHttpError('user_id and vehicle_data with license_plate are required', 400);
    }

    const targetUser = await User.findByPk(user_id);
    if (!targetUser) {
        throw createHttpError('User not found', 404);
    }

    let resolvedGarageId = garage_id;
    if ((user?.role === 'garage_admin' || user?.role === 'service_technician') && !resolvedGarageId) {
        if (user.role === 'garage_admin') {
            const garage = await Garage.findOne({where: {owner_user_id: user.id}});
            if (garage) {
                resolvedGarageId = garage.id;
            } else if (user.garage_id) {
                resolvedGarageId = user.garage_id;
            }
        } else {
            resolvedGarageId = user.garage_id;
        }
    }

    if (!resolvedGarageId) {
        throw createHttpError('garage_id is required', 400);
    }

    const normalizedPlate = vehicle_data.license_plate.trim().toUpperCase();
    const existingVehicle = await Vehicle.findOne({where: {license_plate: normalizedPlate}});
    if (existingVehicle) {
        throw createHttpError('A vehicle with this license plate already exists', 400);
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const carRegisterRequest = await CarRegisterRequest.create({
        user_id,
        garage_id: resolvedGarageId,
        requested_by_user_id: user.id,
        status: 'pending',
        expires_at: expiresAt,
        verification_code: null,
        verification_code_hash: null,
        code_verified: false,
        vehicle_data,
    });

    const garage = await Garage.findByPk(resolvedGarageId);
    const garageName = garage ? garage.name : 'A garage';

    const emailSent = await sendCarRegisterRequestEmail(
        targetUser.email,
        carRegisterRequest.id,
        garageName,
        normalizedPlate,
        vehicle_data
    );

    try {
        const Notification = require('./Notification');
        await Notification.createAndDispatch({
            user_id: user_id,
            type: 'car_register_request',
            title: 'Vehicle Registration Request',
            message: `${garageName} is requesting to register a vehicle (${normalizedPlate}) to your account. Please confirm or reject this request.`,
            read: false,
            related_entity_type: 'car_register_request',
            related_entity_id: carRegisterRequest.id,
            metadata: {
                garage_name: garageName,
                license_plate: normalizedPlate,
                vehicle_data: vehicle_data,
            },
        });
    } catch (notifError) {
        console.error('Error creating notification:', notifError);
    }

    return {
        status: 201,
        data: {
            message: 'Car registration request created. Notification sent to car owner. Waiting for confirmation.',
            car_register_request: {
                id: carRegisterRequest.id,
                status: carRegisterRequest.status,
                expires_at: carRegisterRequest.expires_at,
            },
            email_sent: emailSent,
        },
    };
};

CarRegisterRequest.getById = async ({params}) => {
    const {id} = params || {};
    const carRegisterRequest = await CarRegisterRequest.findByPk(id, {
        include: [{model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone']}],
    });

    if (!carRegisterRequest) {
        throw createHttpError('Car registration request not found', 404);
    }

    return {
        status: 200,
        data: {car_register_request: carRegisterRequest},
    };
};

CarRegisterRequest.verifyCode = async ({params, body}) => {
    const {id} = params || {};
    const {code} = body || {};

    if (!code) {
        throw createHttpError('Verification code is required', 400);
    }

    const carRegisterRequest = await CarRegisterRequest.findByPk(id);

    if (!carRegisterRequest) {
        throw createHttpError('Car registration request not found', 404);
    }

    if (carRegisterRequest.status !== 'pending') {
        throw createHttpError('Car registration request is not pending', 400);
    }

    if (new Date() > new Date(carRegisterRequest.expires_at)) {
        carRegisterRequest.status = 'expired';
        await carRegisterRequest.save();
        throw createHttpError('Car registration request has expired', 400);
    }

    const codeString = String(code).trim();
    if (!/^\d{6}$/.test(codeString)) {
        throw createHttpError('Verification code must be exactly 6 digits', 400);
    }

    const isValidCode = verifyCode(codeString, carRegisterRequest.verification_code_hash);
    if (!isValidCode) {
        throw createHttpError('Invalid verification code', 400);
    }

    carRegisterRequest.code_verified = true;
    await carRegisterRequest.save();

    return {
        status: 200,
        data: {
            message: 'Verification code confirmed. You can now register the vehicle.',
            car_register_request: {
                id: carRegisterRequest.id,
                code_verified: true,
            },
        },
    };
};

CarRegisterRequest.registerVehicle = async ({params}) => {
    const {id} = params || {};
    const carRegisterRequest = await CarRegisterRequest.findByPk(id);

    if (!carRegisterRequest) {
        throw createHttpError('Car registration request not found', 404);
    }

    if (carRegisterRequest.status !== 'confirmed') {
        throw createHttpError(`Car owner must confirm the request first. Current status: ${carRegisterRequest.status}`, 400);
    }

    if (new Date() > new Date(carRegisterRequest.expires_at)) {
        carRegisterRequest.status = 'expired';
        await carRegisterRequest.save();
        throw createHttpError('Car registration request has expired', 400);
    }

    const normalizedPlate = carRegisterRequest.vehicle_data.license_plate.trim().toUpperCase();
    const existingVehicle = await Vehicle.findOne({where: {license_plate: normalizedPlate}});
    if (existingVehicle) {
        throw createHttpError('A vehicle with this license plate already exists', 400);
    }

    const vehicle = await Vehicle.create({
        owner_id: carRegisterRequest.user_id,
        make: carRegisterRequest.vehicle_data.make,
        model: carRegisterRequest.vehicle_data.model,
        year: carRegisterRequest.vehicle_data.year,
        vin: carRegisterRequest.vehicle_data.vin,
        license_plate: normalizedPlate,
        fuel_type: carRegisterRequest.vehicle_data.fuel_type,
    });

    carRegisterRequest.status = 'confirmed';
    carRegisterRequest.code_verified = true;
    await carRegisterRequest.save();

    return {
        status: 200,
        data: {
            message: 'Vehicle registered successfully',
            vehicle,
        },
    };
};

CarRegisterRequest.confirm = async ({params, user}) => {
    const {id} = params || {};
    const carRegisterRequest = await CarRegisterRequest.findByPk(id);

    if (!carRegisterRequest) {
        throw createHttpError('Car registration request not found', 404);
    }

    if (carRegisterRequest.user_id !== user.id) {
        throw createHttpError('You can only confirm your own requests', 403);
    }

    if (carRegisterRequest.status !== 'pending') {
        throw createHttpError(`Request is not pending. Current status: ${carRegisterRequest.status}`, 400);
    }

    if (new Date() > new Date(carRegisterRequest.expires_at)) {
        carRegisterRequest.status = 'expired';
        await carRegisterRequest.save();
        throw createHttpError('Request has expired', 400);
    }

    carRegisterRequest.status = 'confirmed';
    carRegisterRequest.code_verified = true;
    await carRegisterRequest.save();

    try {
        const Notification = require('./Notification');
        await Notification.update(
            {
                read: true,
                read_at: new Date(),
            },
            {
                where: {
                    user_id: user.id,
                    related_entity_type: 'car_register_request',
                    related_entity_id: carRegisterRequest.id,
                },
            }
        );

        await Notification.createAndDispatch({
            user_id: carRegisterRequest.requested_by_user_id,
            type: 'car_register_request',
            title: 'Vehicle Registration Confirmed',
            message: `${user.name || 'Car owner'} confirmed vehicle registration for ${carRegisterRequest.vehicle_data?.license_plate || 'the vehicle'}.`,
            read: false,
            related_entity_type: 'car_register_request',
            related_entity_id: carRegisterRequest.id,
            metadata: {
                status: 'confirmed',
                user_name: user.name,
                license_plate: carRegisterRequest.vehicle_data?.license_plate || null,
            },
        });
    } catch (notifError) {
        console.error('Error updating notification:', notifError);
    }

    return {
        status: 200,
        data: {
            message: 'Car registration request confirmed. The service provider can now register your vehicle.',
            car_register_request: {
                id: carRegisterRequest.id,
                status: carRegisterRequest.status,
            },
        },
    };
};

CarRegisterRequest.reject = async ({params, user}) => {
    const {id} = params || {};
    const carRegisterRequest = await CarRegisterRequest.findByPk(id);

    if (!carRegisterRequest) {
        throw createHttpError('Car registration request not found', 404);
    }

    if (carRegisterRequest.user_id !== user.id) {
        throw createHttpError('You can only reject your own requests', 403);
    }

    if (carRegisterRequest.status !== 'pending') {
        throw createHttpError(`Request is not pending. Current status: ${carRegisterRequest.status}`, 400);
    }

    carRegisterRequest.status = 'rejected';
    await carRegisterRequest.save();

    try {
        const Notification = require('./Notification');
        await Notification.update(
            {
                read: true,
                read_at: new Date(),
            },
            {
                where: {
                    user_id: user.id,
                    related_entity_type: 'car_register_request',
                    related_entity_id: carRegisterRequest.id,
                },
            }
        );

        await Notification.createAndDispatch({
            user_id: carRegisterRequest.requested_by_user_id,
            type: 'car_register_request',
            title: 'Vehicle Registration Rejected',
            message: `${user.name || 'Car owner'} rejected vehicle registration for ${carRegisterRequest.vehicle_data?.license_plate || 'the vehicle'}.`,
            read: false,
            related_entity_type: 'car_register_request',
            related_entity_id: carRegisterRequest.id,
            metadata: {
                status: 'rejected',
                user_name: user.name,
                license_plate: carRegisterRequest.vehicle_data?.license_plate || null,
            },
        });
    } catch (notifError) {
        console.error('Error updating notification:', notifError);
    }

    return {
        status: 200,
        data: {
            message: 'Car registration request rejected.',
            car_register_request: {
                id: carRegisterRequest.id,
                status: carRegisterRequest.status,
            },
        },
    };
};

module.exports = CarRegisterRequest;
