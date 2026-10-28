const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');

// One row per paid service of a referred garage. The rate is copied in, so later
// changes to the reseller's commission settings never change past earnings.
const ResellerCommission = sequelize.define('ResellerCommission', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    reseller_user_id: {type: DataTypes.INTEGER, allowNull: false},
    service_id: {type: DataTypes.INTEGER, allowNull: false},
    garage_id: {type: DataTypes.INTEGER, allowNull: false},
    garage_admin_user_id: {type: DataTypes.INTEGER, allowNull: false},
    base_amount: {type: DataTypes.INTEGER, allowNull: false}, // Service payment the commission was taken from (RWF)
    commission_type: {type: DataTypes.ENUM('percentage', 'fixed'), allowNull: false},
    commission_value: {type: DataTypes.DECIMAL(10, 2), allowNull: false},
    amount: {type: DataTypes.INTEGER, allowNull: false}, // Commission earned (RWF)
    earned_at: {type: DataTypes.DATE, allowNull: false},
}, {
    tableName: 'reseller_commissions',
    underscored: true,
    // Keep snake_case names in API responses too (default would be createdAt/updatedAt).
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        // Guarantees a paid service never earns commission twice (status checks and webhooks can both fire).
        {name: 'reseller_commissions_service_id', unique: true, fields: ['service_id']},
        {name: 'reseller_commissions_reseller_user_id', fields: ['reseller_user_id']},
    ],
});

module.exports = ResellerCommission;
