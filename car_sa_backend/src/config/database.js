const {Sequelize} = require('sequelize');

const DB_CONNECT_TIMEOUT_MS = Number(process.env.DB_CONNECT_TIMEOUT_MS || 5000);
const DB_QUERY_TIMEOUT_MS = Number(process.env.DB_QUERY_TIMEOUT_MS || 15000);
const DB_POOL_ACQUIRE_MS = Number(process.env.DB_POOL_ACQUIRE_MS || 15000);
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_DIALECT = process.env.DB_DIALECT || 'mysql';

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    port: DB_PORT,
    dialect: DB_DIALECT,
    logging: false,
    timezone: '+00:00', // Use UTC timezone
    dialectOptions: {
        // Prevent hanging forever when the database is down or slow.
        connectTimeout: DB_CONNECT_TIMEOUT_MS,
    },
    pool: {
        max: 10,
        min: 0,
        acquire: DB_POOL_ACQUIRE_MS,
        idle: 10000,
    },
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter:true});
        console.log(`Database connected successfully using ${DB_DIALECT}`);
    } catch (error) {
        console.log('Database connection failed', error);
    }
};

module.exports = {sequelize, connectDB};
