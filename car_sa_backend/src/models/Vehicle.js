// src/models/Vehicle.js
const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');
const User = require('./User');
const {createHttpError} = require('../utils/httpError');

const Vehicle = sequelize.define('Vehicle', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    owner_id: {type: DataTypes.INTEGER, allowNull: false},
    make: {type: DataTypes.STRING(50), allowNull: true},
    model: {type: DataTypes.STRING(50), allowNull: true},
    year: {type: DataTypes.INTEGER, allowNull: true},
    vin: {type: DataTypes.STRING(50), allowNull: true},
    license_plate: {type: DataTypes.STRING(20), allowNull: false},
    fuel_type: {type: DataTypes.STRING(20), allowNull: true},
}, {
    tableName: 'vehicles',
    underscored: true,
    indexes: [
        {name: 'vin', unique: true, fields: ['vin']},
        {name: 'license_plate', unique: true, fields: ['license_plate']},
    ],
});

Vehicle.belongsTo(User, {foreignKey: 'owner_id', as: 'owner'});
User.hasMany(Vehicle, {foreignKey: 'owner_id', as: 'vehicles'});

Vehicle.getVehiclesByOwner = async ({query, user}) => {
    const {owner_id} = query || {};
    const requestingUserId = user.id;
    const requestingUserRole = user.role;
    const targetOwnerId = owner_id ? parseInt(owner_id) : requestingUserId;

    if (requestingUserRole === 'car_owner' && targetOwnerId !== requestingUserId) {
        throw createHttpError('You can only access your own vehicles', 403);
    }

    const owner = await User.findByPk(targetOwnerId);
    if (!owner) {
        throw createHttpError('Owner not found', 404);
    }

    const vehicles = await Vehicle.findAll({
        where: {owner_id: targetOwnerId},
        include: [
            {
                model: User,
                as: 'owner',
                attributes: ['id', 'name', 'email', 'phone'],
            },
        ],
        order: [['created_at', 'DESC']],
    });

    return {
        status: 200,
        data: {
            owner: {
                id: owner.id,
                name: owner.name,
                email: owner.email,
                phone: owner.phone,
            },
            vehicles,
            count: vehicles.length,
        },
    };
};

Vehicle.getVehicleById = async ({params, user}) => {
    const {id} = params || {};
    const requestingUserId = user.id;
    const requestingUserRole = user.role;

    const vehicle = await Vehicle.findByPk(id, {
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
    if (requestingUserRole === 'car_owner' && vehicle.owner_id !== requestingUserId) {
        throw createHttpError('You can only access your own vehicles', 403);
    }

    return {
        status: 200,
        data: {vehicle},
    };
};

Vehicle.getAllVehicles = async ({query, user}) => {
    const requestingUserRole = user.role;
    if (requestingUserRole !== 'super_admin' && requestingUserRole !== 'garage_admin') {
        throw createHttpError('You do not have permission to view all vehicles', 403);
    }

    const {limit = 50, offset = 0} = query || {};

    const vehicles = await Vehicle.findAll({
        include: [
            {
                model: User,
                as: 'owner',
                attributes: ['id', 'name', 'email', 'phone'],
            },
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
    });

    const totalCount = await Vehicle.count();

    return {
        status: 200,
        data: {
            vehicles,
            total: totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
        },
    };
};

module.exports = Vehicle;
