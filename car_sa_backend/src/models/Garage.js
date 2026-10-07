const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');
const BusinessDocument = require('./BusinessDocument');
const bcrypt = require('bcrypt');
const {createHttpError} = require('../utils/httpError');

const Garage = sequelize.define('Garage', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    owner_user_id: {type: DataTypes.INTEGER, allowNull: false},
    name: {type: DataTypes.STRING(150), allowNull: false},
    address: {type: DataTypes.TEXT, allowNull: true},
    city: {type: DataTypes.STRING(100), allowNull: true},
    country: {type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Rwanda'},
    registration_number: {type: DataTypes.STRING(50), allowNull: true},
}, {
    tableName: 'garages',
    underscored: true,
});

// Associations with BusinessDocument
Garage.hasMany(BusinessDocument, {foreignKey: 'garage_id', as: 'documents'});
BusinessDocument.belongsTo(Garage, {foreignKey: 'garage_id', as: 'garage'});

Garage.createGarage = async ({body, user}) => {
    if (!user) {
        throw createHttpError('Authentication required', 401);
    }

    const {owner_user_id, name, address, city, country, registration_number, documents} = body || {};

    let resolvedOwnerId = owner_user_id;

    if (user.role === 'garage_admin') {
        if (owner_user_id && owner_user_id !== user.id) {
            throw createHttpError('garage admins can only create garages for themselves', 403);
        }
        resolvedOwnerId = user.id;
    } else if (user.role !== 'super_admin') {
        throw createHttpError('Only super admins or garage admins can create garages', 403);
    }

    if (!resolvedOwnerId || !name) {
        throw createHttpError('owner_user_id and name are required', 400);
    }

    const User = require('./User');
    const owner = await User.findByPk(resolvedOwnerId);
    if (!owner) {
        throw createHttpError('Owner user not found', 404);
    }
    if (owner.role !== 'garage_admin') {
        throw createHttpError('owner_user_id must belong to a garage admin', 400);
    }

    if (!Array.isArray(documents) || documents.length === 0) {
        throw createHttpError('At least one business document is required', 400);
    }

    const garage = await Garage.create({
        owner_user_id: resolvedOwnerId,
        name,
        address,
        city,
        country,
        registration_number,
    });

    const docsPayload = documents.map((doc) => ({
        garage_id: garage.id,
        doc_type: doc.doc_type || doc.type,
        file_path: doc.file_path || doc.url,
        issued_date: doc.issued_date,
        expiry_date: doc.expiry_date,
    }));

    const createdDocs = await BusinessDocument.bulkCreate(docsPayload);
    console.log(`Created ${createdDocs.length} business document(s) for garage ID: ${garage.id}`);

    if (!owner.garage_id) {
        await owner.update({garage_id: garage.id});
    }

    return {
        status: 201,
        data: {
            message: 'Garage created successfully',
            garage,
            documents_count: createdDocs.length,
        },
    };
};

Garage.listGarages = async ({user}) => {
    const whereClause = {};

    if (user?.role === 'garage_admin') {
        whereClause.owner_user_id = user.id;
    }

    const garages = await Garage.findAll({
        where: whereClause,
        include: [
            {
                model: BusinessDocument,
                as: 'documents',
            },
            {
                model: require('./User'),
                as: 'owner',
                attributes: ['id', 'name', 'email', 'phone'],
            },
        ],
        order: [['created_at', 'DESC']],
    });

    return {
        status: 200,
        data: garages,
    };
};

Garage.registerVehicle = async ({body}) => {
    const {
        owner_id,
        owner_name,
        owner_email,
        owner_phone,
        owner_password,
        make,
        model,
        year,
        vin,
        license_plate,
        fuel_type,
        owner_date_of_birth,
        owner_gender,
    } = body || {};

    if (!license_plate) {
        throw createHttpError('license_plate is required', 400);
    }

    const User = require('./User');
    const Vehicle = require('./Vehicle');
    let resolvedOwnerId = owner_id;
    let temporaryPassword = null;

    if (!resolvedOwnerId) {
        if (!owner_email || !owner_name) {
            throw createHttpError('Owner name and email are required when owner_id is not provided', 400);
        }

        let owner = await User.findOne({where: {email: owner_email}});
        if (!owner) {
            const rawPassword = owner_password || Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(rawPassword, 10);

            owner = await User.create({
                name: owner_name,
                email: owner_email,
                phone: owner_phone,
                date_of_birth: owner_date_of_birth,
                gender: owner_gender,
                role: 'car_owner',
                password_hash: hashedPassword,
            });

            resolvedOwnerId = owner.id;
            temporaryPassword = owner_password ? null : rawPassword;
        } else {
            resolvedOwnerId = owner.id;
        }
    } else {
        const owner = await User.findByPk(resolvedOwnerId);
        if (!owner) {
            throw createHttpError('Owner not found', 404);
        }
    }

    const normalizedPlate = license_plate.trim().toUpperCase();

    const existingVehicle = await Vehicle.findOne({where: {license_plate: normalizedPlate}});
    if (existingVehicle) {
        throw createHttpError('A vehicle with this license plate already exists', 400);
    }

    const vehicle = await Vehicle.create({
        owner_id: resolvedOwnerId,
        make,
        model,
        year,
        vin,
        license_plate: normalizedPlate,
        fuel_type,
    });

    return {
        status: 201,
        data: {
            message: 'Vehicle registered successfully',
            vehicle,
            owner_id: resolvedOwnerId,
            temporary_password: temporaryPassword,
        },
    };
};

Garage.findVehicleByLicensePlate = async ({query}) => {
    const Vehicle = require('./Vehicle');
    const User = require('./User');
    const {plate} = query || {};
    if (!plate) {
        throw createHttpError('License plate is required', 400);
    }

    const normalizedPlate = plate.trim().toUpperCase();

    const vehicle = await Vehicle.findOne({
        where: {license_plate: normalizedPlate},
        include: [
            {
                model: User,
                as: 'owner',
                attributes: ['id', 'name', 'email', 'phone'],
            },
        ],
    });

    if (!vehicle) {
        throw createHttpError('Vehicle not found', 404);
    }

    return {
        status: 200,
        data: vehicle,
    };
};

module.exports = Garage;
