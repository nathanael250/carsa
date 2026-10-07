const Garage = require('../models/Garage');

async function resolveAccessibleGarageIds(user) {
    if (!user) {
        return [];
    }

    if (user.role === 'garage_admin') {
        const ownedGarages = await Garage.findAll({
            where: {owner_user_id: user.id},
            attributes: ['id'],
        });

        return [...new Set([
            ...ownedGarages.map((garage) => Number(garage.id)).filter(Boolean),
            ...(user.garage_id ? [Number(user.garage_id)] : []),
        ])];
    }

    if (user.role === 'service_technician') {
        return user.garage_id ? [Number(user.garage_id)] : [];
    }

    return [];
}

module.exports = {
    resolveAccessibleGarageIds,
};
