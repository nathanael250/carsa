const bcrypt = require('bcrypt');
const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');
const User = require('./User');
const Garage = require('./Garage');
const Vehicle = require('./Vehicle');
const {createHttpError} = require('../utils/httpError');
const {resolveAccessibleGarageIds} = require('../utils/garageAccess');

// History of ownership changes. The vehicle keeps its service history; only the owner changes.
const VehicleTransfer = sequelize.define('VehicleTransfer', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    vehicle_id: {type: DataTypes.INTEGER, allowNull: false},
    from_owner_id: {type: DataTypes.INTEGER, allowNull: false},
    to_owner_id: {type: DataTypes.INTEGER, allowNull: false},
    performed_by_user_id: {type: DataTypes.INTEGER, allowNull: false}, // Garage admin or technician who did it
    garage_id: {type: DataTypes.INTEGER, allowNull: true},
    notes: {type: DataTypes.TEXT, allowNull: true},
}, {
    tableName: 'vehicle_transfers',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {name: 'vehicle_transfers_vehicle_id', fields: ['vehicle_id']},
    ],
});

VehicleTransfer.belongsTo(User, {foreignKey: 'from_owner_id', as: 'from_owner', constraints: false});
VehicleTransfer.belongsTo(User, {foreignKey: 'to_owner_id', as: 'to_owner', constraints: false});
VehicleTransfer.belongsTo(User, {foreignKey: 'performed_by_user_id', as: 'performed_by', constraints: false});
VehicleTransfer.belongsTo(Garage, {foreignKey: 'garage_id', as: 'garage', constraints: false});

const ownerAttributes = ['id', 'name', 'email', 'phone'];

async function notify(values) {
    try {
        const Notification = require('./Notification');
        await Notification.createAndDispatch({read: false, type: 'system', related_entity_type: 'vehicle', ...values});
    } catch (error) {
        console.error('Error creating transfer notification:', error);
    }
}

/**
 * Garage staff: move a vehicle to a new owner (the buyer).
 * params.vehicle_id; body.new_owner_id for an existing account, or new_owner_name + new_owner_email
 * (+ phone, password) to create the buyer's account.
 */
VehicleTransfer.transferVehicle = async ({params, body, user}) => {
    const {vehicle_id} = params || {};
    const {
        new_owner_id,
        new_owner_name,
        new_owner_email,
        new_owner_phone,
        new_owner_password,
        notes,
    } = body || {};

    const vehicle = await Vehicle.findByPk(vehicle_id, {
        include: [{model: User, as: 'owner', attributes: ownerAttributes}],
    });
    if (!vehicle) {
        throw createHttpError('Vehicle not found', 404);
    }

    let garageId = null;
    if (user.role === 'garage_admin' || user.role === 'service_technician') {
        const garageIds = await resolveAccessibleGarageIds(user);
        if (garageIds.length === 0) {
            throw createHttpError('You need to belong to a garage to transfer vehicles', 403);
        }
        garageId = garageIds[0];
    }

    let newOwner = null;
    if (new_owner_id) {
        newOwner = await User.findByPk(new_owner_id);
        if (!newOwner) {
            throw createHttpError('New owner not found', 404);
        }
    } else {
        if (!new_owner_email || !new_owner_name) {
            throw createHttpError("The new owner's name and email are required", 400);
        }
        newOwner = await User.findOne({where: {email: String(new_owner_email).trim()}});
    }

    if (newOwner && newOwner.role !== 'car_owner') {
        throw createHttpError('The new owner must be a car owner account. Use a different email.', 400);
    }
    if (newOwner && newOwner.id === vehicle.owner_id) {
        throw createHttpError('This person already owns the vehicle', 400);
    }

    const previousOwner = vehicle.owner;
    let temporaryPassword = null;

    const transfer = await sequelize.transaction(async (transaction) => {
        if (!newOwner) {
            const rawPassword = new_owner_password || Math.random().toString(36).slice(-8);
            newOwner = await User.create({
                name: String(new_owner_name).trim(),
                email: String(new_owner_email).trim(),
                phone: new_owner_phone || null,
                role: 'car_owner',
                password_hash: await bcrypt.hash(String(rawPassword), 10),
                email_verified: true,
            }, {transaction});
            temporaryPassword = new_owner_password ? null : rawPassword;
        }

        // Re-read with a lock so two transfers of the same car cannot cross.
        const locked = await Vehicle.findByPk(vehicle.id, {transaction, lock: transaction.LOCK.UPDATE});
        if (locked.owner_id !== vehicle.owner_id) {
            throw createHttpError('This vehicle was just transferred by someone else. Please refresh.', 409);
        }
        await locked.update({owner_id: newOwner.id}, {transaction});

        return VehicleTransfer.create({
            vehicle_id: vehicle.id,
            from_owner_id: vehicle.owner_id,
            to_owner_id: newOwner.id,
            performed_by_user_id: user.id,
            garage_id: garageId,
            notes: notes || null,
        }, {transaction});
    });

    const garage = garageId ? await Garage.findByPk(garageId, {attributes: ['id', 'name']}) : null;
    const where = garage ? ` at ${garage.name}` : '';
    const plate = vehicle.license_plate;

    if (previousOwner) {
        await notify({
            user_id: previousOwner.id,
            title: 'Vehicle Transferred',
            message: `Your vehicle (${plate}) was transferred to ${newOwner.name}${where}. If you did not agree to this, contact CarSa support.`,
            related_entity_id: vehicle.id,
            metadata: {license_plate: plate, transfer_id: transfer.id},
        });
    }
    await notify({
        user_id: newOwner.id,
        title: 'Vehicle Added to Your Account',
        message: `The vehicle ${plate} is now registered to you${where}. Its service history is in your app.`,
        related_entity_id: vehicle.id,
        metadata: {license_plate: plate, transfer_id: transfer.id},
    });

    const updatedVehicle = await Vehicle.findByPk(vehicle.id, {
        include: [{model: User, as: 'owner', attributes: ownerAttributes}],
    });

    return {
        status: 200,
        data: {
            message: `Vehicle ${plate} transferred to ${newOwner.name}`,
            vehicle: updatedVehicle,
            transfer,
            previous_owner: previousOwner,
            new_owner: {id: newOwner.id, name: newOwner.name, email: newOwner.email, phone: newOwner.phone},
            temporary_password: temporaryPassword,
        },
    };
};

/** Ownership history of one vehicle, newest first. */
VehicleTransfer.listForVehicle = async ({params, user}) => {
    const {vehicle_id} = params || {};
    const vehicle = await Vehicle.findByPk(vehicle_id, {attributes: ['id', 'owner_id', 'license_plate']});
    if (!vehicle) {
        throw createHttpError('Vehicle not found', 404);
    }
    if (user.role === 'car_owner' && vehicle.owner_id !== user.id) {
        throw createHttpError('You can only view your own vehicles', 403);
    }

    const transfers = await VehicleTransfer.findAll({
        where: {vehicle_id: vehicle.id},
        include: [
            {model: User, as: 'from_owner', attributes: ['id', 'name']},
            {model: User, as: 'to_owner', attributes: ['id', 'name']},
            {model: User, as: 'performed_by', attributes: ['id', 'name']},
            {model: Garage, as: 'garage', attributes: ['id', 'name']},
        ],
        order: [['created_at', 'DESC']],
    });

    return {status: 200, data: {vehicle_id: vehicle.id, transfers}};
};

module.exports = VehicleTransfer;
