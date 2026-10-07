const Service = require('./Service');
const Garage = require('./Garage');
const Vehicle = require('./Vehicle');
const Notification = require('./Notification');
const User = require('./User');
const {sequelize} = require('../config/database');
const {Op, fn, col, literal} = require('sequelize');
const {createHttpError} = require('../utils/httpError');
const {resolveAccessibleGarageIds} = require('../utils/garageAccess');

class GarageDashboard {
    static async getDashboardStats({user}) {
        const requestingUserId = user.id;
        const requestingUserRole = user.role;

        if (requestingUserRole !== 'garage_admin') {
            throw createHttpError('This endpoint is only available for garage admins', 403);
        }

        const accessibleGarageIds = await resolveAccessibleGarageIds(user);
        if (accessibleGarageIds.length === 0) {
            throw createHttpError('Garage not found. Please register your garage first.', 404);
        }

        const garageWhereClause = accessibleGarageIds.length === 1
            ? accessibleGarageIds[0]
            : {[Op.in]: accessibleGarageIds};

        const garages = await Garage.findAll({
            where: {id: garageWhereClause},
            attributes: ['id', 'name', 'city'],
            order: [['id', 'ASC']],
        });

        if (garages.length === 0) {
            throw createHttpError('Garage not found. Please register your garage first.', 404);
        }

        const completedServices = await Service.findAll({
            where: {
                garage_id: garageWhereClause,
                status: 'completed',
            },
            include: [
                {
                    model: Vehicle,
                    as: 'vehicle',
                    attributes: ['id', 'owner_id'],
                    required: true,
                },
            ],
            attributes: ['id', 'vehicle_id'],
        });

        const uniqueVehicleIds = new Set();
        completedServices.forEach(service => {
            if (service.vehicle && service.vehicle.id) {
                uniqueVehicleIds.add(service.vehicle.id);
            }
        });
        const carsServicedCount = uniqueVehicleIds.size;

        const allServices = await Service.findAll({
            where: {
                garage_id: garageWhereClause,
            },
            include: [
                {
                    model: Vehicle,
                    as: 'vehicle',
                    attributes: ['owner_id'],
                    required: true,
                },
            ],
            attributes: ['id', 'vehicle_id'],
        });

        const uniqueOwnerIds = new Set();
        allServices.forEach(service => {
            if (service.vehicle && service.vehicle.owner_id) {
                uniqueOwnerIds.add(service.vehicle.owner_id);
            }
        });
        const uniqueClientsCount = uniqueOwnerIds.size;

        const unreadNotificationsCount = await Notification.count({
            where: {
                user_id: requestingUserId,
                read: false,
            },
        });

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const totalToday = await Service.count({
            where: {
                garage_id: garageWhereClause,
                created_at: {[Op.gte]: startOfToday},
            },
        });
        const totalWeek = await Service.count({
            where: {
                garage_id: garageWhereClause,
                created_at: {[Op.gte]: startOfWeek},
            },
        });
        const totalMonth = await Service.count({
            where: {
                garage_id: garageWhereClause,
                created_at: {[Op.gte]: startOfMonth},
            },
        });

        const jobsInProgress = await Service.count({
            where: {garage_id: garageWhereClause, status: 'in_progress'},
        });
        const jobsCompleted = await Service.count({
            where: {garage_id: garageWhereClause, status: 'completed'},
        });

        const recentServices = await Service.findAll({
            where: {garage_id: garageWhereClause},
            include: [
                {model: Vehicle, as: 'vehicle', attributes: ['id', 'license_plate', 'make', 'model']},
                {model: User, as: 'performed_by', attributes: ['id', 'name', 'email']},
            ],
            order: [['created_at', 'DESC']],
            limit: 10,
        });

        const topMechanicRows = await Service.findAll({
            where: {garage_id: garageWhereClause, status: 'completed'},
            attributes: [
                'performed_by_user_id',
                [fn('COUNT', col('id')), 'jobs_completed'],
            ],
            group: ['performed_by_user_id'],
            order: [[literal('jobs_completed'), 'DESC']],
            limit: 5,
        });

        const mechanicIds = topMechanicRows
            .map(row => row.performed_by_user_id)
            .filter(Boolean);

        const mechanics = mechanicIds.length > 0
            ? await User.findAll({
                where: {id: mechanicIds},
                attributes: ['id', 'name', 'email', 'role'],
            })
            : [];

        const mechanicMap = new Map(mechanics.map(m => [m.id, m]));
        const topMechanics = topMechanicRows.map(row => ({
            user: mechanicMap.get(row.performed_by_user_id) || null,
            jobs_completed: parseInt(row.get('jobs_completed'), 10) || 0,
        }));

        const recentVehicles = recentServices
            .map(service => service.vehicle)
            .filter(Boolean)
            .slice(0, 10);

        return {
            status: 200,
            data: {
                cars_serviced: carsServicedCount,
                unique_clients: uniqueClientsCount,
                new_updates: unreadNotificationsCount,
                service_requests: {
                    today: totalToday,
                    week: totalWeek,
                    month: totalMonth,
                },
                jobs: {
                    in_progress: jobsInProgress,
                    completed: jobsCompleted,
                },
                recent_services: recentServices,
                top_mechanics: topMechanics,
                top_service_technicians: topMechanics,
                recent_vehicles: recentVehicles,
                garage: {
                    id: garages[0].id,
                    name: garages.length === 1 ? garages[0].name : `${garages.length} garages`,
                    city: garages.length === 1 ? garages[0].city : null,
                },
            },
        };
    }
}

module.exports = GarageDashboard;
