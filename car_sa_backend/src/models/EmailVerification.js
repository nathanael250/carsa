const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');

const EmailVerification = sequelize.define('EmailVerification', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    user_id: {type: DataTypes.INTEGER, allowNull: false},
    token: {type: DataTypes.STRING, allowNull: false},
    expires_at: {type: DataTypes.DATE, allowNull: false},
    used: {type: DataTypes.BOOLEAN, defaultValue: false},
}, {
    tableName: 'email_verifications',
    underscored: true,
    indexes: [
        {name: 'token', unique: true, fields: ['token']},
    ],
});

module.exports = EmailVerification;

