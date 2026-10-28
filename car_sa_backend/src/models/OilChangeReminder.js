const {DataTypes, Op, UniqueConstraintError} = require('sequelize');
const {sequelize} = require('../config/database');
const Service = require('./Service');
const ServiceCatalog = require('./ServiceCatalog');
const Vehicle = require('./Vehicle');

const OIL_SERVICE_KINDS = ['engine_oil_change', 'gearbox_oil_change', 'transmission_oil_change'];
// Used when an oil service's interval is in km: we don't know the car's mileage, so we estimate a date.
const DEFAULT_OIL_INTERVAL_DAYS = Number(process.env.OIL_CHANGE_INTERVAL_DAYS || 90);
const UPCOMING_NOTICE_DAYS = Number(process.env.OIL_CHANGE_NOTICE_DAYS || 7);
const DAY_MS = 24 * 60 * 60 * 1000;

// One row per reminder sent, so each one goes out only once (even with several servers running).
const OilChangeReminder = sequelize.define('OilChangeReminder', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    service_id: {type: DataTypes.INTEGER, allowNull: false}, // The completed oil change the reminder follows
    vehicle_id: {type: DataTypes.INTEGER, allowNull: false},
    owner_id: {type: DataTypes.INTEGER, allowNull: false},
    kind: {type: DataTypes.ENUM('upcoming', 'due'), allowNull: false},
    due_date: {type: DataTypes.DATE, allowNull: false},
}, {
    tableName: 'oil_change_reminders',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {name: 'oil_change_reminders_service_kind', unique: true, fields: ['service_id', 'kind']},
    ],
});

function isOilService(catalog) {
    if (!catalog) return false;
    if (catalog.service_kind) return OIL_SERVICE_KINDS.includes(catalog.service_kind);
    return String(catalog.name || '').toLowerCase().includes('oil');
}

function oilDueDate(service, catalog) {
    const completed = service.completed_at || service.paid_at || service.created_at;
    if (!completed) return null;
    const days = catalog.interval_type === 'days' && catalog.recommended_interval_days
        ? catalog.recommended_interval_days
        : DEFAULT_OIL_INTERVAL_DAYS;
    return new Date(new Date(completed).getTime() + days * DAY_MS);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
}

/**
 * Sends oil change reminders that are due now. Safe to run as often as needed.
 * Returns how many reminders were sent.
 */
OilChangeReminder.sendDueReminders = async (now = new Date()) => {
    const catalogs = await ServiceCatalog.findAll();
    const oilCatalogs = catalogs.filter(isOilService);
    if (oilCatalogs.length === 0) {
        return {sent: 0};
    }
    const catalogById = new Map(oilCatalogs.map(catalog => [catalog.id, catalog]));

    const services = await Service.findAll({
        where: {status: 'completed', service_catalog_id: {[Op.in]: [...catalogById.keys()]}},
        include: [{model: Vehicle, as: 'vehicle', attributes: ['id', 'owner_id', 'license_plate', 'make', 'model']}],
        order: [['completed_at', 'DESC']],
    });

    // Only the latest oil change of each kind counts: a newer one replaces the older reminder.
    const latest = new Map();
    for (const service of services) {
        const key = `${service.vehicle_id}:${service.service_catalog_id}`;
        if (!latest.has(key)) latest.set(key, service);
    }

    const Notification = require('./Notification');
    let sent = 0;

    for (const service of latest.values()) {
        const catalog = catalogById.get(service.service_catalog_id);
        const vehicle = service.vehicle;
        const dueDate = oilDueDate(service, catalog);
        if (!vehicle?.owner_id || !dueDate) continue;

        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / DAY_MS);
        let kind = null;
        if (daysLeft <= 0) kind = 'due';
        else if (daysLeft <= UPCOMING_NOTICE_DAYS) kind = 'upcoming';
        if (!kind) continue;

        // A car already overdue when this feature starts only gets the "due" reminder.
        try {
            await OilChangeReminder.create({
                service_id: service.id,
                vehicle_id: vehicle.id,
                owner_id: vehicle.owner_id,
                kind,
                due_date: dueDate,
            });
        } catch (error) {
            if (error instanceof UniqueConstraintError) continue;
            throw error;
        }

        const carName = [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Your vehicle';
        const mileageHint = service.next_service_mileage
            ? ` or at ${Number(service.next_service_mileage).toLocaleString('en-US')} km, whichever comes first`
            : '';
        const message = kind === 'due'
            ? `${carName} (${vehicle.license_plate}) is due for an oil change (${catalog.name})${mileageHint}. Please visit a garage soon.`
            : `${carName} (${vehicle.license_plate}) will be due for an oil change (${catalog.name}) on ${formatDate(dueDate)}${mileageHint}.`;

        try {
            await Notification.createAndDispatch({
                user_id: vehicle.owner_id,
                type: 'service_request',
                title: kind === 'due' ? 'Oil Change Due' : 'Oil Change Coming Up',
                message,
                read: false,
                related_entity_type: 'vehicle',
                related_entity_id: vehicle.id,
                metadata: {
                    reminder: 'oil_change',
                    kind,
                    vehicle_id: vehicle.id,
                    license_plate: vehicle.license_plate,
                    service_name: catalog.name,
                    due_date: dueDate,
                    next_service_mileage: service.next_service_mileage,
                    last_service_id: service.id,
                },
            });
            sent += 1;
        } catch (error) {
            console.error(`Failed to send oil change reminder for service ${service.id}:`, error);
        }
    }

    return {sent};
};

/** Super admin: run the reminder check now instead of waiting for the next scheduled run. */
OilChangeReminder.runNow = async () => {
    const result = await OilChangeReminder.sendDueReminders();
    return {status: 200, data: {message: `${result.sent} oil change reminder(s) sent`, ...result}};
};

let timer = null;

/** Checks for due reminders shortly after start, then every few hours. Off with OIL_REMINDERS_ENABLED=false. */
OilChangeReminder.startScheduler = () => {
    if (timer || String(process.env.OIL_REMINDERS_ENABLED || 'true').toLowerCase() === 'false') {
        return;
    }
    const hours = Number(process.env.OIL_REMINDER_CHECK_HOURS || 6);
    const run = () => OilChangeReminder.sendDueReminders()
        .then(({sent}) => {
            if (sent > 0) console.log(`Oil change reminders sent: ${sent}`);
        })
        .catch(error => console.error('Oil change reminder check failed:', error));
    setTimeout(run, 60 * 1000).unref();
    timer = setInterval(run, hours * 60 * 60 * 1000);
    timer.unref();
};

module.exports = OilChangeReminder;
