const crypto = require('crypto');
const bcrypt = require('bcrypt');
const {DataTypes, Op, fn, col, UniqueConstraintError} = require('sequelize');
const {sequelize} = require('../config/database');
const User = require('./User');
const Garage = require('./Garage');
const ResellerCommission = require('./ResellerCommission');
const ResellerPayout = require('./ResellerPayout');
const {createHttpError} = require('../utils/httpError');

const COMMISSION_TYPES = ['percentage', 'fixed'];
const PAYOUT_METHODS = ['mobile_money', 'bank'];
// Requests still waiting for the admin hold their amount, so it cannot be requested twice.
const RESERVED_PAYOUT_STATUSES = ['pending', 'approved'];
const MIN_PAYOUT_AMOUNT = Number(process.env.RESELLER_MIN_PAYOUT || 1000);
// No 0/O or 1/I, so codes are easy to read out and type.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const Reseller = sequelize.define('Reseller', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    user_id: {type: DataTypes.INTEGER, allowNull: false},
    referral_code: {type: DataTypes.STRING(20), allowNull: false},
    commission_type: {type: DataTypes.ENUM(...COMMISSION_TYPES), allowNull: false, defaultValue: 'percentage'},
    commission_value: {type: DataTypes.DECIMAL(10, 2), allowNull: false},
    notes: {type: DataTypes.TEXT, allowNull: true},
}, {
    tableName: 'reseller_profiles',
    underscored: true,
    // Keep snake_case names in API responses too (default would be createdAt/updatedAt).
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {name: 'reseller_profiles_user_id', unique: true, fields: ['user_id']},
        {name: 'reseller_profiles_referral_code', unique: true, fields: ['referral_code']},
    ],
});

Reseller.belongsTo(User, {foreignKey: 'user_id', as: 'user'});
User.hasOne(Reseller, {foreignKey: 'user_id', as: 'reseller_profile'});
ResellerCommission.belongsTo(Garage, {foreignKey: 'garage_id', as: 'garage', constraints: false});
ResellerPayout.belongsTo(User, {foreignKey: 'reseller_user_id', as: 'reseller', constraints: false});
ResellerPayout.belongsTo(User, {foreignKey: 'reviewed_by_user_id', as: 'reviewed_by', constraints: false});

const userAttributes = ['id', 'name', 'email', 'phone', 'active', 'created_at'];

function formatRwf(amount) {
    return `RWF ${Number(amount || 0).toLocaleString('en-US')}`;
}

function parsePaging(query, defaultLimit = 50) {
    const limit = Math.min(Math.max(parseInt(query?.limit, 10) || defaultLimit, 1), 500);
    const offset = Math.max(parseInt(query?.offset, 10) || 0, 0);
    return {limit, offset};
}

function normalizeReferralCode(code) {
    return String(code || '').replace(/[\s-]+/g, '').toUpperCase();
}

function generateReferralCode() {
    // 256 is a multiple of the alphabet size (32), so every character is equally likely.
    const bytes = crypto.randomBytes(6);
    let code = 'RS';
    for (const byte of bytes) {
        code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
    return code;
}

async function createUniqueReferralCode(transaction) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const code = generateReferralCode();
        const existing = await Reseller.findOne({where: {referral_code: code}, transaction});
        if (!existing) {
            return code;
        }
    }
    throw createHttpError('Could not generate a unique referral code. Please try again.', 500);
}

function parseCommissionSettings(commission_type, commission_value) {
    if (!COMMISSION_TYPES.includes(commission_type)) {
        throw createHttpError('commission_type must be "percentage" or "fixed"', 400);
    }
    const value = Number(commission_value);
    if (!Number.isFinite(value) || value <= 0) {
        throw createHttpError('commission_value must be a number greater than 0', 400);
    }
    if (commission_type === 'percentage' && value > 100) {
        throw createHttpError('A percentage commission cannot be more than 100', 400);
    }
    if (commission_type === 'fixed' && !Number.isInteger(value)) {
        throw createHttpError('A fixed commission must be a whole number of RWF', 400);
    }
    return {commission_type, commission_value: value};
}

function calculateCommission(baseAmount, commissionType, commissionValue) {
    const base = Number(baseAmount) || 0;
    const value = Number(commissionValue) || 0;
    if (base <= 0 || value <= 0) {
        return 0;
    }
    const raw = commissionType === 'percentage' ? (base * value) / 100 : value;
    // Never pay out more than the payment itself.
    return Math.min(Math.round(raw), base);
}

function emptyBalance() {
    return {total_earned: 0, commissions_count: 0, paid_out: 0, pending_payouts: 0, available_balance: 0};
}

async function getBalances(resellerUserIds, {transaction} = {}) {
    const ids = [...new Set(resellerUserIds.map(Number))].filter(Boolean);
    const balances = new Map(ids.map(id => [id, emptyBalance()]));
    if (ids.length === 0) {
        return balances;
    }

    const earnedRows = await ResellerCommission.findAll({
        where: {reseller_user_id: ids},
        attributes: [
            'reseller_user_id',
            [fn('COALESCE', fn('SUM', col('amount')), 0), 'total'],
            [fn('COUNT', col('id')), 'count'],
        ],
        group: ['reseller_user_id'],
        raw: true,
        transaction,
    });
    for (const row of earnedRows) {
        const balance = balances.get(Number(row.reseller_user_id));
        balance.total_earned = Number(row.total || 0);
        balance.commissions_count = Number(row.count || 0);
    }

    const payoutRows = await ResellerPayout.findAll({
        where: {reseller_user_id: ids, status: [...RESERVED_PAYOUT_STATUSES, 'paid']},
        attributes: ['reseller_user_id', 'status', [fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
        group: ['reseller_user_id', 'status'],
        raw: true,
        transaction,
    });
    for (const row of payoutRows) {
        const balance = balances.get(Number(row.reseller_user_id));
        if (row.status === 'paid') {
            balance.paid_out += Number(row.total || 0);
        } else {
            balance.pending_payouts += Number(row.total || 0);
        }
    }

    for (const balance of balances.values()) {
        balance.available_balance = balance.total_earned - balance.paid_out - balance.pending_payouts;
    }
    return balances;
}

async function getBalance(resellerUserId, options) {
    const balances = await getBalances([resellerUserId], options);
    return balances.get(Number(resellerUserId)) || emptyBalance();
}

function serializeProfile(profile) {
    return {
        referral_code: profile.referral_code,
        commission_type: profile.commission_type,
        commission_value: Number(profile.commission_value),
    };
}

function serializeReseller(profile, balance, referredGaragesCount = 0) {
    const user = profile.user;
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        active: user.active,
        created_at: user.get('created_at') || user.createdAt,
        ...serializeProfile(profile),
        notes: profile.notes,
        referred_garages_count: referredGaragesCount,
        ...balance,
    };
}

async function findProfileOrFail(resellerUserId, {transaction, lock} = {}) {
    const profile = await Reseller.findOne({
        where: {user_id: resellerUserId},
        include: [{model: User, as: 'user', attributes: userAttributes}],
        transaction,
        lock,
    });
    if (!profile || !profile.user) {
        throw createHttpError('Reseller not found', 404);
    }
    return profile;
}

async function countReferredGarages(resellerUserIds) {
    const ids = [...new Set(resellerUserIds.map(Number))].filter(Boolean);
    const counts = new Map(ids.map(id => [id, 0]));
    if (ids.length === 0) {
        return counts;
    }
    const rows = await User.findAll({
        where: {role: 'garage_admin', referred_by_reseller_id: ids},
        attributes: ['referred_by_reseller_id', [fn('COUNT', col('id')), 'count']],
        group: ['referred_by_reseller_id'],
        raw: true,
    });
    for (const row of rows) {
        counts.set(Number(row.referred_by_reseller_id), Number(row.count || 0));
    }
    return counts;
}

async function listReferredGarages(resellerUserId) {
    const garageAdmins = await User.findAll({
        where: {role: 'garage_admin', referred_by_reseller_id: resellerUserId},
        attributes: ['id', 'name', 'email', 'phone', 'approved', 'referred_at'],
        include: [{model: Garage, as: 'garage', attributes: ['id', 'name', 'city']}],
        order: [['referred_at', 'DESC']],
    });

    const earnedRows = await ResellerCommission.findAll({
        where: {reseller_user_id: resellerUserId},
        attributes: [
            'garage_admin_user_id',
            [fn('COALESCE', fn('SUM', col('amount')), 0), 'total'],
            [fn('COUNT', col('id')), 'count'],
        ],
        group: ['garage_admin_user_id'],
        raw: true,
    });
    const earnedByAdmin = new Map(earnedRows.map(row => [Number(row.garage_admin_user_id), row]));

    return garageAdmins.map(admin => {
        const earned = earnedByAdmin.get(admin.id);
        return {
            garage_admin_id: admin.id,
            owner_name: admin.name,
            owner_email: admin.email,
            owner_phone: admin.phone,
            approved: admin.approved,
            referred_at: admin.referred_at,
            garage_id: admin.garage?.id || null,
            garage_name: admin.garage?.name || null,
            city: admin.garage?.city || null,
            total_earned: Number(earned?.total || 0),
            paid_services_count: Number(earned?.count || 0),
        };
    });
}

async function listCommissions(where, {limit, offset}) {
    const {rows, count} = await ResellerCommission.findAndCountAll({
        where,
        include: [{model: Garage, as: 'garage', attributes: ['id', 'name']}],
        order: [['earned_at', 'DESC']],
        limit,
        offset,
    });
    return {commissions: rows, total: count};
}

async function notify(values) {
    try {
        const Notification = require('./Notification');
        await Notification.createAndDispatch({read: false, type: 'system', ...values});
    } catch (error) {
        console.error('Error creating reseller notification:', error);
    }
}

async function notifySuperAdmins(values) {
    const admins = await User.findAll({where: {role: 'super_admin', active: true}, attributes: ['id']});
    for (const admin of admins) {
        await notify({...values, user_id: admin.id});
    }
}

/**
 * Finds the active reseller for a referral code. Used when a garage admin signs up.
 */
Reseller.findActiveByReferralCode = async (code, {transaction} = {}) => {
    const normalized = normalizeReferralCode(code);
    if (!normalized) {
        return null;
    }
    const profile = await Reseller.findOne({
        where: {referral_code: normalized},
        include: [{model: User, as: 'user', attributes: ['id', 'role', 'active']}],
        transaction,
    });
    if (!profile?.user || profile.user.role !== 'reseller' || !profile.user.active) {
        return null;
    }
    return profile;
};

/**
 * Records the reseller's commission for a paid service, if the garage was referred.
 * Safe to call more than once for the same service.
 */
Reseller.recordCommissionForService = async (service) => {
    if (!service || service.payment_status !== 'SUCCESS' || !service.payment_amount) {
        return null;
    }

    const existing = await ResellerCommission.findOne({where: {service_id: service.id}});
    if (existing) {
        return existing;
    }

    const garage = await Garage.findByPk(service.garage_id, {attributes: ['id', 'name', 'owner_user_id']});
    if (!garage) {
        return null;
    }

    const garageAdmin = await User.findByPk(garage.owner_user_id, {
        attributes: ['id', 'referred_by_reseller_id', 'referred_at'],
    });
    if (!garageAdmin?.referred_by_reseller_id) {
        return null;
    }

    const earnedAt = service.paid_at ? new Date(service.paid_at) : new Date();
    // Only payments made after the garage was linked earn commission.
    if (garageAdmin.referred_at && earnedAt < new Date(garageAdmin.referred_at)) {
        return null;
    }

    const profile = await Reseller.findOne({
        where: {user_id: garageAdmin.referred_by_reseller_id},
        include: [{model: User, as: 'user', attributes: ['id', 'role', 'active']}],
    });
    if (!profile?.user || profile.user.role !== 'reseller' || !profile.user.active) {
        return null;
    }

    const amount = calculateCommission(service.payment_amount, profile.commission_type, profile.commission_value);
    if (amount <= 0) {
        return null;
    }

    let commission;
    try {
        commission = await ResellerCommission.create({
            reseller_user_id: profile.user_id,
            service_id: service.id,
            garage_id: garage.id,
            garage_admin_user_id: garageAdmin.id,
            base_amount: service.payment_amount,
            commission_type: profile.commission_type,
            commission_value: profile.commission_value,
            amount,
            earned_at: earnedAt,
        });
    } catch (error) {
        if (error instanceof UniqueConstraintError) {
            // Another request (status check or webhook) recorded it at the same moment.
            return ResellerCommission.findOne({where: {service_id: service.id}});
        }
        throw error;
    }

    await notify({
        user_id: profile.user_id,
        title: 'Commission Earned',
        message: `You earned ${formatRwf(amount)} from a service paid at ${garage.name}.`,
        related_entity_type: 'reseller_commission',
        related_entity_id: commission.id,
        metadata: {garage_name: garage.name, amount, base_amount: service.payment_amount},
    });

    return commission;
};

// ---------------------------------------------------------------------------
// Super admin
// ---------------------------------------------------------------------------

Reseller.createReseller = async ({body}) => {
    const {name, email, phone, password, commission_type, commission_value, notes} = body || {};

    if (!name || !email || !password) {
        throw createHttpError('Name, email, and password are required', 400);
    }
    if (String(password).length < 6) {
        throw createHttpError('Password must be at least 6 characters', 400);
    }
    const commission = parseCommissionSettings(commission_type, commission_value);

    const normalizedEmail = String(email).trim();
    const existing = await User.findOne({where: {email: normalizedEmail}});
    if (existing) {
        throw createHttpError('Email already in use', 400);
    }

    const profile = await sequelize.transaction(async (transaction) => {
        const user = await User.create({
            name: String(name).trim(),
            email: normalizedEmail,
            phone: phone || null,
            role: 'reseller',
            password_hash: await bcrypt.hash(String(password), 10),
            email_verified: true,
            approved: true,
        }, {transaction});

        return Reseller.create({
            user_id: user.id,
            referral_code: await createUniqueReferralCode(transaction),
            ...commission,
            notes: notes || null,
        }, {transaction});
    });

    const created = await findProfileOrFail(profile.user_id);
    return {
        status: 201,
        data: {
            message: 'Reseller created successfully',
            reseller: serializeReseller(created, emptyBalance(), 0),
        },
    };
};

Reseller.listResellers = async ({query}) => {
    const {search} = query || {};
    const userWhere = {};
    if (search) {
        const like = `%${String(search).trim()}%`;
        userWhere[Op.or] = [{name: {[Op.like]: like}}, {email: {[Op.like]: like}}, {phone: {[Op.like]: like}}];
    }

    const profiles = await Reseller.findAll({
        include: [{model: User, as: 'user', attributes: userAttributes, where: userWhere}],
        order: [['created_at', 'DESC']],
    });
    const ids = profiles.map(profile => profile.user_id);
    const [balances, garageCounts] = await Promise.all([getBalances(ids), countReferredGarages(ids)]);

    const resellers = profiles.map(profile => serializeReseller(
        profile,
        balances.get(profile.user_id) || emptyBalance(),
        garageCounts.get(profile.user_id) || 0,
    ));

    const totals = resellers.reduce((sum, reseller) => ({
        total_earned: sum.total_earned + reseller.total_earned,
        paid_out: sum.paid_out + reseller.paid_out,
        pending_payouts: sum.pending_payouts + reseller.pending_payouts,
        available_balance: sum.available_balance + reseller.available_balance,
    }), {total_earned: 0, paid_out: 0, pending_payouts: 0, available_balance: 0});

    return {
        status: 200,
        data: {currency: 'RWF', resellers, totals},
    };
};

Reseller.getReseller = async ({params}) => {
    const {id} = params || {};
    const profile = await findProfileOrFail(id);

    const [balance, garages, commissions, payouts] = await Promise.all([
        getBalance(profile.user_id),
        listReferredGarages(profile.user_id),
        listCommissions({reseller_user_id: profile.user_id}, {limit: 100, offset: 0}),
        ResellerPayout.findAll({
            where: {reseller_user_id: profile.user_id},
            include: [{model: User, as: 'reviewed_by', attributes: ['id', 'name']}],
            order: [['created_at', 'DESC']],
            limit: 100,
        }),
    ]);

    return {
        status: 200,
        data: {
            currency: 'RWF',
            reseller: serializeReseller(profile, balance, garages.length),
            garages,
            commissions: commissions.commissions,
            commissions_total: commissions.total,
            payouts,
        },
    };
};

Reseller.updateReseller = async ({params, body}) => {
    const {id} = params || {};
    const {name, email, phone, password, active, commission_type, commission_value, notes} = body || {};
    const profile = await findProfileOrFail(id);
    const user = await User.findByPk(profile.user_id);

    const userUpdate = {};
    if (name !== undefined) {
        if (!String(name).trim()) {
            throw createHttpError('Name cannot be empty', 400);
        }
        userUpdate.name = String(name).trim();
    }
    if (phone !== undefined) userUpdate.phone = phone || null;
    if (active !== undefined) userUpdate.active = !!active;
    if (email !== undefined) {
        const normalizedEmail = String(email).trim();
        const existing = await User.findOne({where: {email: normalizedEmail}});
        if (existing && existing.id !== user.id) {
            throw createHttpError('Email already in use', 400);
        }
        userUpdate.email = normalizedEmail;
    }
    if (password !== undefined && password !== '') {
        if (String(password).length < 6) {
            throw createHttpError('Password must be at least 6 characters', 400);
        }
        userUpdate.password_hash = await bcrypt.hash(String(password), 10);
    }

    const profileUpdate = {};
    if (commission_type !== undefined || commission_value !== undefined) {
        Object.assign(profileUpdate, parseCommissionSettings(
            commission_type ?? profile.commission_type,
            commission_value ?? profile.commission_value,
        ));
    }
    if (notes !== undefined) profileUpdate.notes = notes || null;

    await sequelize.transaction(async (transaction) => {
        if (Object.keys(userUpdate).length > 0) {
            await user.update(userUpdate, {transaction});
        }
        if (Object.keys(profileUpdate).length > 0) {
            await profile.update(profileUpdate, {transaction});
        }
    });

    const updated = await findProfileOrFail(profile.user_id);
    const [balance, garageCounts] = await Promise.all([
        getBalance(profile.user_id),
        countReferredGarages([profile.user_id]),
    ]);

    return {
        status: 200,
        data: {
            message: 'Reseller updated successfully',
            reseller: serializeReseller(updated, balance, garageCounts.get(profile.user_id) || 0),
        },
    };
};

/**
 * Links a garage (through its garage admin) to a reseller, or unlinks it when reseller_id is empty.
 */
Reseller.setGarageReseller = async ({params, body}) => {
    const {garage_id} = params || {};
    const {reseller_id} = body || {};

    const garage = await Garage.findByPk(garage_id, {attributes: ['id', 'name', 'owner_user_id']});
    if (!garage) {
        throw createHttpError('Garage not found', 404);
    }
    const garageAdmin = await User.findByPk(garage.owner_user_id);
    if (!garageAdmin || garageAdmin.role !== 'garage_admin') {
        throw createHttpError('This garage has no garage admin to link', 400);
    }

    if (reseller_id === undefined || reseller_id === null || reseller_id === '') {
        await garageAdmin.update({referred_by_reseller_id: null, referred_at: null});
        return {
            status: 200,
            data: {message: `${garage.name} is no longer linked to a reseller`, garage_id: garage.id, reseller_id: null},
        };
    }

    const profile = await findProfileOrFail(reseller_id);
    if (Number(garageAdmin.referred_by_reseller_id) !== Number(profile.user_id)) {
        // Commission counts from the moment of linking.
        await garageAdmin.update({referred_by_reseller_id: profile.user_id, referred_at: new Date()});
    }

    return {
        status: 200,
        data: {
            message: `${garage.name} is now linked to ${profile.user.name}`,
            garage_id: garage.id,
            reseller_id: profile.user_id,
        },
    };
};

Reseller.listPayouts = async ({query}) => {
    const {status, reseller_id} = query || {};
    const paging = parsePaging(query);
    const where = {};
    if (status) where.status = status;
    if (reseller_id) where.reseller_user_id = reseller_id;

    const {rows, count} = await ResellerPayout.findAndCountAll({
        where,
        include: [
            {model: User, as: 'reseller', attributes: ['id', 'name', 'email', 'phone']},
            {model: User, as: 'reviewed_by', attributes: ['id', 'name']},
        ],
        order: [['created_at', 'DESC']],
        ...paging,
    });

    const pendingCount = await ResellerPayout.count({where: {status: 'pending'}});

    return {
        status: 200,
        data: {currency: 'RWF', payouts: rows, total: count, pending_count: pendingCount, ...paging},
    };
};

async function reviewPayout({params, body, user}, {from, to, title, message}) {
    const {id} = params || {};
    const {admin_note, payment_reference} = body || {};

    const payout = await sequelize.transaction(async (transaction) => {
        const record = await ResellerPayout.findByPk(id, {transaction, lock: transaction.LOCK.UPDATE});
        if (!record) {
            throw createHttpError('Payout request not found', 404);
        }
        if (!from.includes(record.status)) {
            throw createHttpError(`This payout request is ${record.status} and cannot be changed to ${to}`, 400);
        }

        record.status = to;
        record.reviewed_by_user_id = user.id;
        record.reviewed_at = new Date();
        if (admin_note !== undefined) record.admin_note = admin_note || null;
        if (to === 'paid') {
            record.paid_at = new Date();
            if (payment_reference !== undefined) record.payment_reference = payment_reference || null;
        }
        await record.save({transaction});
        return record;
    });

    await notify({
        user_id: payout.reseller_user_id,
        title,
        message: message(payout),
        related_entity_type: 'reseller_payout',
        related_entity_id: payout.id,
        metadata: {amount: payout.amount, status: payout.status},
    });

    const updated = await ResellerPayout.findByPk(payout.id, {
        include: [
            {model: User, as: 'reseller', attributes: ['id', 'name', 'email', 'phone']},
            {model: User, as: 'reviewed_by', attributes: ['id', 'name']},
        ],
    });
    return {
        status: 200,
        data: {message: `Payout request ${to}`, payout: updated},
    };
}

Reseller.approvePayout = (context) => reviewPayout(context, {
    from: ['pending'],
    to: 'approved',
    title: 'Payout Approved',
    message: payout => `Your payout request of ${formatRwf(payout.amount)} was approved. You will receive the money soon.`,
});

Reseller.rejectPayout = (context) => reviewPayout(context, {
    from: ['pending', 'approved'],
    to: 'rejected',
    title: 'Payout Rejected',
    message: payout => `Your payout request of ${formatRwf(payout.amount)} was rejected${payout.admin_note ? `: ${payout.admin_note}` : '.'} The amount is back in your balance.`,
});

Reseller.markPayoutPaid = (context) => reviewPayout(context, {
    from: ['approved'],
    to: 'paid',
    title: 'Payout Sent',
    message: payout => `${formatRwf(payout.amount)} has been sent to your account${payout.payment_reference ? ` (ref ${payout.payment_reference})` : ''}.`,
});

// ---------------------------------------------------------------------------
// Reseller (mobile app)
// ---------------------------------------------------------------------------

Reseller.getMyDashboard = async ({user}) => {
    const profile = await findProfileOrFail(user.id);
    const [balance, garages, commissions, payouts] = await Promise.all([
        getBalance(profile.user_id),
        listReferredGarages(profile.user_id),
        listCommissions({reseller_user_id: profile.user_id}, {limit: 10, offset: 0}),
        ResellerPayout.findAll({
            where: {reseller_user_id: profile.user_id},
            order: [['created_at', 'DESC']],
            limit: 5,
        }),
    ]);

    return {
        status: 200,
        data: {
            currency: 'RWF',
            min_payout_amount: MIN_PAYOUT_AMOUNT,
            reseller: {
                id: profile.user.id,
                name: profile.user.name,
                email: profile.user.email,
                phone: profile.user.phone,
                ...serializeProfile(profile),
            },
            balance,
            // Resellers see who they referred, but not the garage owners' contact details.
            garages: garages.map(({owner_email, owner_phone, ...garage}) => garage),
            recent_commissions: commissions.commissions,
            recent_payouts: payouts,
        },
    };
};

Reseller.listMyCommissions = async ({user, query}) => {
    const paging = parsePaging(query);
    const {commissions, total} = await listCommissions({reseller_user_id: user.id}, paging);
    return {
        status: 200,
        data: {currency: 'RWF', commissions, total, ...paging},
    };
};

Reseller.listMyPayouts = async ({user, query}) => {
    const paging = parsePaging(query);
    const {rows, count} = await ResellerPayout.findAndCountAll({
        where: {reseller_user_id: user.id},
        order: [['created_at', 'DESC']],
        ...paging,
    });
    return {
        status: 200,
        data: {currency: 'RWF', payouts: rows, total: count, ...paging},
    };
};

Reseller.requestPayout = async ({user, body}) => {
    const {amount, method, account_name, account_number, bank_name, note} = body || {};

    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
        throw createHttpError('amount must be a whole number of RWF', 400);
    }
    if (parsedAmount < MIN_PAYOUT_AMOUNT) {
        throw createHttpError(`The minimum payout is ${formatRwf(MIN_PAYOUT_AMOUNT)}`, 400);
    }
    if (!PAYOUT_METHODS.includes(method)) {
        throw createHttpError('method must be "mobile_money" or "bank"', 400);
    }
    if (!String(account_name || '').trim() || !String(account_number || '').trim()) {
        throw createHttpError('account_name and account_number are required', 400);
    }
    if (method === 'bank' && !String(bank_name || '').trim()) {
        throw createHttpError('bank_name is required for bank payouts', 400);
    }

    const payout = await sequelize.transaction(async (transaction) => {
        // Lock the reseller's profile so two requests at once cannot both spend the same balance.
        const profile = await findProfileOrFail(user.id, {transaction, lock: transaction.LOCK.UPDATE});
        if (!profile.user.active) {
            throw createHttpError('Your reseller account is disabled. Contact the administrator.', 403);
        }

        const balance = await getBalance(user.id, {transaction});
        if (parsedAmount > balance.available_balance) {
            throw createHttpError(`You can request at most ${formatRwf(balance.available_balance)}`, 400, {
                available_balance: balance.available_balance,
            });
        }

        return ResellerPayout.create({
            reseller_user_id: user.id,
            amount: parsedAmount,
            method,
            account_name: String(account_name).trim(),
            account_number: String(account_number).trim(),
            bank_name: method === 'bank' ? String(bank_name).trim() : null,
            reseller_note: note || null,
            status: 'pending',
        }, {transaction});
    });

    const reseller = await User.findByPk(user.id, {attributes: ['id', 'name']});
    await notifySuperAdmins({
        title: 'New Payout Request',
        message: `${reseller?.name || 'A reseller'} requested a payout of ${formatRwf(payout.amount)}.`,
        related_entity_type: 'reseller_payout',
        related_entity_id: payout.id,
        metadata: {amount: payout.amount, reseller_id: user.id},
    });

    return {
        status: 201,
        data: {
            message: 'Payout request sent. The administrator will review it.',
            payout,
            balance: await getBalance(user.id),
        },
    };
};

Reseller.cancelMyPayout = async ({user, params}) => {
    const {id} = params || {};
    const payout = await sequelize.transaction(async (transaction) => {
        const record = await ResellerPayout.findOne({
            where: {id, reseller_user_id: user.id},
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!record) {
            throw createHttpError('Payout request not found', 404);
        }
        if (record.status !== 'pending') {
            throw createHttpError('Only pending payout requests can be cancelled', 400);
        }
        record.status = 'cancelled';
        await record.save({transaction});
        return record;
    });

    return {
        status: 200,
        data: {
            message: 'Payout request cancelled',
            payout,
            balance: await getBalance(user.id),
        },
    };
};

Reseller.calculateCommission = calculateCommission;

module.exports = Reseller;
