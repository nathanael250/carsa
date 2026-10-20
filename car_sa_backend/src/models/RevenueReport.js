const Service = require('./Service');
const Garage = require('./Garage');
const Vehicle = require('./Vehicle');
const User = require('./User');
const ServiceCatalog = require('./ServiceCatalog');
const {sequelize} = require('../config/database');
const {Op, fn, col, literal} = require('sequelize');
const {createHttpError} = require('../utils/httpError');

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PENDING_PAYMENT_STATUSES = ['QUEUED', 'PROCESSING'];

function parseDate(value, fieldName) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw createHttpError(`${fieldName} is not a valid date`, 400);
    }
    return date;
}

function buildDateRange(date_from, date_to) {
    const range = {[Op.ne]: null};
    if (date_from) {
        range[Op.gte] = parseDate(date_from, 'date_from');
    }
    if (date_to) {
        const end = parseDate(date_to, 'date_to');
        if (DATE_ONLY_PATTERN.test(String(date_to))) {
            // Treat a plain date as inclusive of the whole day.
            end.setUTCDate(end.getUTCDate() + 1);
            range[Op.lt] = end;
        } else {
            range[Op.lte] = end;
        }
    }
    return range;
}

function emptyBucket() {
    return {count: 0, amount: 0};
}

class RevenueReport {
    static async getRevenueReport({query}) {
        const {garage_id, date_from, date_to, limit = 100, offset = 0} = query || {};
        const selectedGarageId = garage_id ? Number(garage_id) : null;
        const dateRange = buildDateRange(date_from, date_to);

        // Money earned = confirmed payments, dated by when they were paid.
        const earnedWhere = {payment_status: 'SUCCESS', paid_at: dateRange};

        const garageRows = await Service.findAll({
            where: earnedWhere,
            attributes: [
                'garage_id',
                [fn('COALESCE', fn('SUM', col('payment_amount')), 0), 'total_amount'],
                [fn('COUNT', col('id')), 'payments_count'],
                [fn('MAX', col('paid_at')), 'last_paid_at'],
            ],
            group: ['garage_id'],
            order: [[literal('total_amount'), 'DESC']],
            raw: true,
        });

        const systemTotal = garageRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);

        const garageIds = garageRows.map(row => Number(row.garage_id)).filter(Boolean);
        if (selectedGarageId && !garageIds.includes(selectedGarageId)) {
            garageIds.push(selectedGarageId);
        }
        const garages = garageIds.length > 0
            ? await Garage.findAll({where: {id: garageIds}, attributes: ['id', 'name', 'city']})
            : [];
        const garageMap = new Map(garages.map(g => [Number(g.id), g]));

        const byGarage = garageRows.map(row => {
            const id = Number(row.garage_id);
            const total = Number(row.total_amount || 0);
            const garage = garageMap.get(id);
            return {
                garage_id: id,
                garage_name: garage?.name || `Garage #${id}`,
                city: garage?.city || null,
                total_amount: total,
                payments_count: Number(row.payments_count || 0),
                share_percent: systemTotal > 0 ? Math.round((total / systemTotal) * 10000) / 100 : 0,
                last_paid_at: row.last_paid_at,
            };
        });

        let selected = null;
        if (selectedGarageId) {
            selected = byGarage.find(row => row.garage_id === selectedGarageId) || {
                garage_id: selectedGarageId,
                garage_name: garageMap.get(selectedGarageId)?.name || `Garage #${selectedGarageId}`,
                city: garageMap.get(selectedGarageId)?.city || null,
                total_amount: 0,
                payments_count: 0,
                share_percent: 0,
                last_paid_at: null,
            };
        }

        // Transaction outcomes. Successful ones are dated by paid_at; failed and pending
        // ones have no paid_at, so they are dated by their last status update.
        const transactionWhere = {
            payment_status: {[Op.ne]: null},
            [Op.and]: [sequelize.where(fn('COALESCE', col('paid_at'), col('updated_at')), dateRange)],
        };
        if (selectedGarageId) {
            transactionWhere.garage_id = selectedGarageId;
        }

        const statusRows = await Service.findAll({
            where: transactionWhere,
            attributes: [
                'payment_status',
                [fn('COUNT', col('id')), 'count'],
                [fn('COALESCE', fn('SUM', col('payment_amount')), 0), 'amount'],
            ],
            group: ['payment_status'],
            raw: true,
        });

        const transactions = {successful: emptyBucket(), failed: emptyBucket(), pending: emptyBucket()};
        for (const row of statusRows) {
            const bucket = row.payment_status === 'SUCCESS'
                ? transactions.successful
                : row.payment_status === 'FAILED'
                    ? transactions.failed
                    : PENDING_PAYMENT_STATUSES.includes(row.payment_status)
                        ? transactions.pending
                        : null;
            if (bucket) {
                bucket.count += Number(row.count || 0);
                bucket.amount += Number(row.amount || 0);
            }
        }

        const paymentsWhere = selectedGarageId ? {...earnedWhere, garage_id: selectedGarageId} : earnedWhere;
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);
        const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

        const {rows: payments, count: paymentsTotal} = await Service.findAndCountAll({
            where: paymentsWhere,
            attributes: ['id', 'garage_id', 'status', 'payment_amount', 'payment_phone', 'payment_provider_ref', 'paid_at', 'completed_at'],
            include: [
                {model: Garage, as: 'garage', attributes: ['id', 'name']},
                {model: Vehicle, as: 'vehicle', attributes: ['id', 'license_plate', 'make', 'model']},
                {model: ServiceCatalog, as: 'service_catalog', attributes: ['id', 'name']},
                {model: User, as: 'performed_by', attributes: ['id', 'name']},
            ],
            order: [['paid_at', 'DESC']],
            limit: parsedLimit,
            offset: parsedOffset,
        });

        return {
            status: 200,
            data: {
                currency: 'RWF',
                filters: {
                    garage_id: selectedGarageId,
                    date_from: date_from || null,
                    date_to: date_to || null,
                },
                system_total: systemTotal,
                earned: selected ? selected.total_amount : systemTotal,
                transactions,
                selected_garage: selected,
                by_garage: byGarage,
                payments,
                payments_total: paymentsTotal,
                limit: parsedLimit,
                offset: parsedOffset,
            },
        };
    }
}

module.exports = RevenueReport;
