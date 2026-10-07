const Vehicle = require('./Vehicle');
const ServiceCatalog = require('./ServiceCatalog');
const Service = require('./Service');
const User = require('./User');
const Garage = require('./Garage');
const {createHttpError} = require('../utils/httpError');

class NextServiceDue {
    static calculateNextServiceDue(lastService, serviceCatalog) {
        let nextServiceDueDate = null;
        let nextServiceDueMileage = null;

        if (!lastService || lastService.status !== 'completed') {
            return {nextServiceDueDate, nextServiceDueMileage};
        }

        if (lastService.next_service_mileage) {
            nextServiceDueMileage = lastService.next_service_mileage;
            return {nextServiceDueDate, nextServiceDueMileage};
        }

        if (serviceCatalog.interval_type === 'days' && serviceCatalog.recommended_interval_days) {
            const completedDate = lastService.completed_at || lastService.created_at;
            if (completedDate) {
                nextServiceDueDate = new Date(completedDate);
                nextServiceDueDate.setDate(nextServiceDueDate.getDate() + serviceCatalog.recommended_interval_days);
            }
        } else if (serviceCatalog.interval_type === 'km' && serviceCatalog.recommended_interval_km) {
            if (lastService.mileage_at_service) {
                nextServiceDueMileage = lastService.mileage_at_service + serviceCatalog.recommended_interval_km;
            }
        }

        return {nextServiceDueDate, nextServiceDueMileage};
    }

    static async getByVehicle({params, user}) {
        const {vehicle_id} = params || {};
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
                throw createHttpError('You can only view next service due for your own vehicles', 403);
            }
        }

        const serviceCatalogs = await ServiceCatalog.findAll();

        const nextServicesDue = [];

        for (const catalog of serviceCatalogs) {
            const lastService = await Service.findOne({
                where: {
                    vehicle_id: vehicle_id,
                    service_catalog_id: catalog.id,
                    status: 'completed',
                },
                include: [
                    {
                        model: Garage,
                        as: 'garage',
                        attributes: ['id', 'name'],
                    },
                ],
                order: [['completed_at', 'DESC']],
            });

            if (lastService) {
                const {nextServiceDueDate, nextServiceDueMileage} = NextServiceDue.calculateNextServiceDue(lastService, catalog);

                nextServicesDue.push({
                    vehicle_id: vehicle.id,
                    service_catalog_id: catalog.id,
                    service_catalog: {
                        id: catalog.id,
                        name: catalog.name,
                        description: catalog.description,
                        interval_type: catalog.interval_type,
                        recommended_interval_days: catalog.recommended_interval_days,
                        recommended_interval_km: catalog.recommended_interval_km,
                    },
                    last_service: {
                        id: lastService.id,
                        completed_at: lastService.completed_at,
                        mileage_at_service: lastService.mileage_at_service,
                        next_service_mileage: lastService.next_service_mileage,
                        actual_cost: lastService.actual_cost,
                        garage: lastService.garage,
                    },
                    next_service_due_date: nextServiceDueDate,
                    next_service_due_mileage: nextServiceDueMileage,
                    last_service_mileage: lastService.mileage_at_service,
                    last_service_date: lastService.completed_at,
                });
            }
        }

        nextServicesDue.sort((a, b) => {
            if (a.next_service_due_date && b.next_service_due_date) {
                return new Date(a.next_service_due_date) - new Date(b.next_service_due_date);
            }
            if (a.next_service_due_mileage && b.next_service_due_mileage) {
                return a.next_service_due_mileage - b.next_service_due_mileage;
            }
            return 0;
        });

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
                next_services_due: nextServicesDue,
            },
        };
    }

    static async getAll({query, user}) {
        const requestingUserId = user.id;
        const requestingUserRole = user.role;
        const {vehicle_id, service_catalog_id} = query || {};

        let vehicleIds = [];

        if (requestingUserRole === 'garage_admin' || requestingUserRole === 'service_technician') {
            let garageId = null;
            if (requestingUserRole === 'garage_admin') {
                const garage = await Garage.findOne({
                    where: {owner_user_id: requestingUserId},
                });
                garageId = garage?.id || user.garage_id;
            } else {
                garageId = user.garage_id;
            }

            if (garageId) {
                const services = await Service.findAll({
                    where: {garage_id: garageId},
                    attributes: ['vehicle_id'],
                    group: ['vehicle_id'],
                });
                vehicleIds = services.map(s => s.vehicle_id);
            }
        } else if (requestingUserRole === 'car_owner') {
            const vehicles = await Vehicle.findAll({
                where: {owner_id: requestingUserId},
                attributes: ['id'],
            });
            vehicleIds = vehicles.map(v => v.id);
        }

        if (vehicle_id) {
            vehicleIds = [parseInt(vehicle_id)];
        }

        const serviceCatalogs = service_catalog_id
            ? await ServiceCatalog.findAll({where: {id: service_catalog_id}})
            : await ServiceCatalog.findAll();

        const allNextServicesDue = [];

        for (const catalog of serviceCatalogs) {
            const whereClause = {
                service_catalog_id: catalog.id,
                status: 'completed',
            };

            if (vehicleIds.length > 0) {
                whereClause.vehicle_id = vehicleIds;
            }

            const lastServices = await Service.findAll({
                where: whereClause,
                include: [
                    {
                        model: Vehicle,
                        as: 'vehicle',
                        include: [
                            {model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phone']},
                        ],
                    },
                    {
                        model: Garage,
                        as: 'garage',
                        attributes: ['id', 'name'],
                    },
                ],
                order: [['vehicle_id', 'ASC'], ['completed_at', 'DESC']],
            });

            const vehicleServiceMap = new Map();
            lastServices.forEach(service => {
                const key = `${service.vehicle_id}_${service.service_catalog_id}`;
                if (!vehicleServiceMap.has(key) ||
                    new Date(service.completed_at) > new Date(vehicleServiceMap.get(key).completed_at)) {
                    vehicleServiceMap.set(key, service);
                }
            });

            vehicleServiceMap.forEach((lastService) => {
                const {nextServiceDueDate, nextServiceDueMileage} = NextServiceDue.calculateNextServiceDue(lastService, catalog);

                allNextServicesDue.push({
                    vehicle_id: lastService.vehicle_id,
                    service_catalog_id: catalog.id,
                    vehicle: {
                        id: lastService.vehicle.id,
                        license_plate: lastService.vehicle.license_plate,
                        make: lastService.vehicle.make,
                        model: lastService.vehicle.model,
                        year: lastService.vehicle.year,
                        owner: lastService.vehicle.owner,
                    },
                    service_catalog: {
                        id: catalog.id,
                        name: catalog.name,
                        description: catalog.description,
                        interval_type: catalog.interval_type,
                        recommended_interval_days: catalog.recommended_interval_days,
                        recommended_interval_km: catalog.recommended_interval_km,
                    },
                    last_service: {
                        id: lastService.id,
                        completed_at: lastService.completed_at,
                        mileage_at_service: lastService.mileage_at_service,
                        next_service_mileage: lastService.next_service_mileage,
                        actual_cost: lastService.actual_cost,
                        garage: lastService.garage,
                    },
                    next_service_due_date: nextServiceDueDate,
                    next_service_due_mileage: nextServiceDueMileage,
                    last_service_mileage: lastService.mileage_at_service,
                    last_service_date: lastService.completed_at,
                });
            });
        }

        allNextServicesDue.sort((a, b) => {
            if (a.next_service_due_date && b.next_service_due_date) {
                return new Date(a.next_service_due_date) - new Date(b.next_service_due_date);
            }
            if (a.next_service_due_mileage && b.next_service_due_mileage) {
                return a.next_service_due_mileage - b.next_service_due_mileage;
            }
            return 0;
        });

        return {
            status: 200,
            data: {
                next_services_due: allNextServicesDue,
                total: allNextServicesDue.length,
            },
        };
    }

    static async getById({params, user}) {
        const {vehicle_id, service_catalog_id} = params || {};
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
                throw createHttpError('You can only access next service due for your own vehicles', 403);
            }
        }

        const serviceCatalog = await ServiceCatalog.findByPk(service_catalog_id);
        if (!serviceCatalog) {
            throw createHttpError('Service catalog item not found', 404);
        }

        const lastService = await Service.findOne({
            where: {
                vehicle_id: vehicle_id,
                service_catalog_id: service_catalog_id,
                status: 'completed',
            },
            include: [
                {
                    model: Garage,
                    as: 'garage',
                    attributes: ['id', 'name'],
                },
            ],
            order: [['completed_at', 'DESC']],
        });

        if (!lastService) {
            throw createHttpError('No completed service found for this vehicle and service type', 404);
        }

        const {nextServiceDueDate, nextServiceDueMileage} = NextServiceDue.calculateNextServiceDue(lastService, serviceCatalog);

        return {
            status: 200,
            data: {
                next_service_due: {
                    vehicle_id: vehicle.id,
                    service_catalog_id: serviceCatalog.id,
                    vehicle: {
                        id: vehicle.id,
                        license_plate: vehicle.license_plate,
                        make: vehicle.make,
                        model: vehicle.model,
                        year: vehicle.year,
                        owner: vehicle.owner,
                    },
                    service_catalog: {
                        id: serviceCatalog.id,
                        name: serviceCatalog.name,
                        description: serviceCatalog.description,
                        interval_type: serviceCatalog.interval_type,
                        recommended_interval_days: serviceCatalog.recommended_interval_days,
                        recommended_interval_km: serviceCatalog.recommended_interval_km,
                    },
                    last_service: {
                        id: lastService.id,
                        completed_at: lastService.completed_at,
                        mileage_at_service: lastService.mileage_at_service,
                        next_service_mileage: lastService.next_service_mileage,
                        actual_cost: lastService.actual_cost,
                        garage: lastService.garage,
                    },
                    next_service_due_date: nextServiceDueDate,
                    next_service_due_mileage: nextServiceDueMileage,
                    last_service_mileage: lastService.mileage_at_service,
                    last_service_date: lastService.completed_at,
                },
            },
        };
    }
}

module.exports = NextServiceDue;
