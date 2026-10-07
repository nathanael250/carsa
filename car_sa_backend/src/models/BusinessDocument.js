const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');

const BusinessDocument = sequelize.define('BusinessDocument', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    garage_id: {type: DataTypes.INTEGER, allowNull: false},
    doc_type: {type: DataTypes.STRING(100), allowNull: false},
    file_path: {type: DataTypes.TEXT, allowNull: true},
    issued_date: {type: DataTypes.DATE, allowNull: true},
    expiry_date: {type: DataTypes.DATE, allowNull: true},
    verified: {type: DataTypes.BOOLEAN, defaultValue: false},
    verified_by_user_id: {type: DataTypes.INTEGER, allowNull: true},
    verified_at: {type: DataTypes.DATE, allowNull: true},
}, {
    tableName: 'business_docs',
    underscored: true,
});

module.exports = BusinessDocument;

