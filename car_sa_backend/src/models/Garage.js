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

Garage.registerVehicle = async ({body, user}) => {
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

    // Check the plate before touching any account, so a duplicate plate never leaves a stray owner behind.
    const normalizedPlate = license_plate.trim().toUpperCase();
    const existingVehicle = await Vehicle.findOne({where: {license_plate: normalizedPlate}});
    if (existingVehicle) {
        throw createHttpError('A vehicle with this license plate already exists', 400);
    }

    let owner = null;
    if (owner_id) {
        owner = await User.findByPk(owner_id);
        if (!owner) {
            throw createHttpError('Owner not found', 404);
        }
    } else {
        if (!owner_email || !owner_name) {
            throw createHttpError('Owner name and email are required when owner_id is not provided', 400);
        }
        owner = await User.findOne({where: {email: owner_email.trim()}});
    }

    if (owner && owner.role !== 'car_owner') {
        throw createHttpError('This account is not a car owner account. Use a different email.', 400);
    }

    const isNewOwner = !owner;
    let temporaryPassword = null;

    // Owner account and vehicle are created together: if either fails, neither is kept.
    const vehicle = await sequelize.transaction(async (transaction) => {
        if (isNewOwner) {
            const rawPassword = owner_password || Math.random().toString(36).slice(-8);
            owner = await User.create({
                name: owner_name,
                email: owner_email.trim(),
                phone: owner_phone,
                date_of_birth: owner_date_of_birth,
                gender: owner_gender,
                role: 'car_owner',
                password_hash: await bcrypt.hash(rawPassword, 10),
            }, {transaction});
            temporaryPassword = owner_password ? null : rawPassword;
        }

        return Vehicle.create({
            owner_id: owner.id,
            make,
            model,
            year,
            vin,
            license_plate: normalizedPlate,
            fuel_type,
        }, {transaction});
    });

    if (!isNewOwner) {
        // No confirmation is required, so let the existing owner know a vehicle was added to their account.
        try {
            const garage = user?.garage_id
                ? await Garage.findByPk(user.garage_id)
                : await Garage.findOne({where: {owner_user_id: user?.id}});
            const garageName = garage?.name || 'A garage';
            const Notification = require('./Notification');
            await Notification.createAndDispatch({
                user_id: owner.id,
                type: 'system',
                title: 'Vehicle Added to Your Account',
                message: `${garageName} registered your vehicle (${normalizedPlate}) to your account.`,
                read: false,
                related_entity_type: 'vehicle',
                related_entity_id: vehicle.id,
                metadata: {
                    garage_name: garageName,
                    license_plate: normalizedPlate,
                    vehicle_id: vehicle.id,
                },
            });
        } catch (notifError) {
            console.error('Error creating notification:', notifError);
        }
    }

    return {
        status: 201,
        data: {
            message: 'Vehicle registered successfully',
            vehicle,
            owner_id: owner.id,
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
