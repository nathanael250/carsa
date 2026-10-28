const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');

// Payout requests made by resellers. Money is sent outside the app; the admin
// approves a request, then marks it paid once the transfer is done.
const ResellerPayout = sequelize.define('ResellerPayout', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    reseller_user_id: {type: DataTypes.INTEGER, allowNull: false},
    amount: {type: DataTypes.INTEGER, allowNull: false}, // RWF
    method: {type: DataTypes.ENUM('mobile_money', 'bank'), allowNull: false},
    account_name: {type: DataTypes.STRING(150), allowNull: false},
    account_number: {type: DataTypes.STRING(60), allowNull: false}, // Mobile money number or bank account number
    bank_name: {type: DataTypes.STRING(120), allowNull: true},
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'paid', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
    },
    reseller_note: {type: DataTypes.TEXT, allowNull: true},
    admin_note: {type: DataTypes.TEXT, allowNull: true},
    payment_reference: {type: DataTypes.STRING(120), allowNull: true},
    reviewed_by_user_id: {type: DataTypes.INTEGER, allowNull: true},
    reviewed_at: {type: DataTypes.DATE, allowNull: true},
    paid_at: {type: DataTypes.DATE, allowNull: true},
}, {
    tableName: 'reseller_payouts',
    underscored: true,
    // Keep snake_case names in API responses too (default would be createdAt/updatedAt).
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {name: 'reseller_payouts_reseller_user_id', fields: ['reseller_user_id']},
        {name: 'reseller_payouts_status', fields: ['status']},
    ],
});

module.exports = ResellerPayout;
