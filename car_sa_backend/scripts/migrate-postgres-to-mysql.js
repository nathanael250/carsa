#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const {Sequelize, QueryTypes} = require('sequelize');

require('dotenv').config({path: path.join(__dirname, '..', '.env')});

const TABLES = [
    {name: 'users', primaryKey: 'id'},
    {name: 'garages', primaryKey: 'id'},
    {name: 'business_docs', primaryKey: 'id'},
    {name: 'email_verifications', primaryKey: 'id'},
    {name: 'vehicles', primaryKey: 'id'},
    {name: 'service_catalog', primaryKey: 'id'},
    {name: 'services', primaryKey: 'id'},
    {name: 'car_register_requests', primaryKey: 'id'},
    {name: 'notifications', primaryKey: 'id'},
];

const RAW_BATCH_SIZE = Number(process.env.MIGRATION_BATCH_SIZE || 500);
const DEFAULT_BATCH_SIZE = Number.isFinite(RAW_BATCH_SIZE) && RAW_BATCH_SIZE > 0
    ? Math.floor(RAW_BATCH_SIZE)
    : 500;
const PG_SCHEMA = process.env.PG_SCHEMA || 'public';
const SHOULD_TRUNCATE_TARGET = parseBoolean(process.env.MIGRATION_TRUNCATE_TARGET);
const SHOULD_SKIP_MISSING_SOURCE_TABLES = parseBoolean(process.env.MIGRATION_SKIP_MISSING_SOURCE_TABLES, true);

function parseBoolean(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    const normalized = String(value).trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function maskValue(value) {
    if (!value) {
        return '(not set)';
    }

    return String(value);
}

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function chunk(array, size) {
    const result = [];
    for (let index = 0; index < array.length; index += size) {
        result.push(array.slice(index, index + size));
    }
    return result;
}

function buildConnections() {
    const targetDialect = process.env.DB_DIALECT || 'mysql';
    if (targetDialect !== 'mysql') {
        throw new Error(`DB_DIALECT must be "mysql" for this migration script. Received "${targetDialect}".`);
    }

    const source = new Sequelize(
        requiredEnv('PG_DB_NAME'),
        requiredEnv('PG_USER'),
        process.env.PG_PASS || '',
        {
            host: requiredEnv('PG_HOST'),
            port: Number(process.env.PG_PORT || 5432),
            dialect: 'postgres',
            logging: false,
        }
    );

    const target = new Sequelize(
        requiredEnv('DB_NAME'),
        requiredEnv('DB_USER'),
        process.env.DB_PASS || '',
        {
            host: requiredEnv('DB_HOST'),
            port: Number(process.env.DB_PORT || 3306),
            dialect: targetDialect,
            logging: false,
        }
    );

    return {source, target};
}

async function fetchExistingSourceTables(source) {
    const rows = await source.query(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = :schemaName
          AND table_type = 'BASE TABLE'
        `,
        {
            replacements: {schemaName: PG_SCHEMA},
            type: QueryTypes.SELECT,
        }
    );

    return new Set(rows.map((row) => row.table_name));
}

async function ensureTargetTablesExist(target) {
    const queryInterface = target.getQueryInterface();

    for (const table of TABLES) {
        try {
            await queryInterface.describeTable(table.name);
        } catch (error) {
            throw new Error(
                `Target table "${table.name}" was not found in MySQL. Start the backend once against MySQL so Sequelize creates the schema, then run the migration again.`
            );
        }
    }
}

async function assertTargetIsEmptyOrTruncate(target) {
    const counts = [];

    for (const table of TABLES) {
        const result = await target.query(
            `SELECT COUNT(*) AS count FROM \`${table.name}\``,
            {type: QueryTypes.SELECT}
        );
        const count = Number(result[0]?.count || 0);
        counts.push({table: table.name, count});
    }

    const nonEmpty = counts.filter((entry) => entry.count > 0);
    if (nonEmpty.length === 0) {
        return;
    }

    if (!SHOULD_TRUNCATE_TARGET) {
        const summary = nonEmpty.map((entry) => `${entry.table}=${entry.count}`).join(', ');
        throw new Error(
            `Target MySQL tables already contain data (${summary}). Re-run with MIGRATION_TRUNCATE_TARGET=true to clear target tables before importing.`
        );
    }

    console.log('Target MySQL already has data. Clearing target tables because MIGRATION_TRUNCATE_TARGET=true.');
    await target.query('SET FOREIGN_KEY_CHECKS = 0');

    try {
        for (const table of [...TABLES].reverse()) {
            await target.query(`DELETE FROM \`${table.name}\``);
        }
    } finally {
        await target.query('SET FOREIGN_KEY_CHECKS = 1');
    }
}

async function getTargetColumnMetadata(target, tableName) {
    return target.getQueryInterface().describeTable(tableName);
}

function normalizeRowForTarget(row, targetColumns) {
    const normalized = {};

    for (const [columnName, value] of Object.entries(row)) {
        const columnMeta = targetColumns[columnName];
        if (!columnMeta) {
            continue;
        }

        if (value === null || value === undefined) {
            normalized[columnName] = null;
            continue;
        }

        const columnType = String(columnMeta.type || '').toUpperCase();
        if (columnType.includes('JSON') && typeof value === 'object') {
            normalized[columnName] = JSON.stringify(value);
            continue;
        }

        normalized[columnName] = value;
    }

    return normalized;
}

async function countSourceRows(source, tableName) {
    const result = await source.query(
        `SELECT COUNT(*)::int AS count FROM "${PG_SCHEMA}"."${tableName}"`,
        {type: QueryTypes.SELECT}
    );

    return Number(result[0]?.count || 0);
}

async function fetchSourceBatch(source, tableName, primaryKey, limit, offset) {
    return source.query(
        `
        SELECT *
        FROM "${PG_SCHEMA}"."${tableName}"
        ORDER BY "${primaryKey}" ASC
        LIMIT :limitValue
        OFFSET :offsetValue
        `,
        {
            replacements: {
                limitValue: limit,
                offsetValue: offset,
            },
            type: QueryTypes.SELECT,
        }
    );
}

async function migrateTable({source, target, tableName, primaryKey}) {
    const totalRows = await countSourceRows(source, tableName);
    const targetColumns = await getTargetColumnMetadata(target, tableName);

    if (totalRows === 0) {
        console.log(`- ${tableName}: source table is empty, skipping.`);
        return {table: tableName, totalRows: 0, insertedRows: 0};
    }

    let insertedRows = 0;
    const batchSize = Math.max(DEFAULT_BATCH_SIZE, 1);

    for (let offset = 0; offset < totalRows; offset += batchSize) {
        const rows = await fetchSourceBatch(source, tableName, primaryKey, batchSize, offset);
        const normalizedRows = rows.map((row) => normalizeRowForTarget(row, targetColumns));

        if (normalizedRows.length > 0) {
            const rowChunks = chunk(normalizedRows, 200);
            for (const rowChunk of rowChunks) {
                await target.getQueryInterface().bulkInsert(tableName, rowChunk, {});
                insertedRows += rowChunk.length;
            }
        }

        console.log(`- ${tableName}: ${insertedRows}/${totalRows} rows imported`);
    }

    return {table: tableName, totalRows, insertedRows};
}

async function resetAutoIncrement(target, tableName, primaryKey) {
    const result = await target.query(
        `SELECT COALESCE(MAX(\`${primaryKey}\`), 0) AS max_id FROM \`${tableName}\``,
        {type: QueryTypes.SELECT}
    );

    const nextValue = Number(result[0]?.max_id || 0) + 1;
    await target.query(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT = ${nextValue}`);
}

async function verifyCounts(target, summaryRows) {
    for (const row of summaryRows) {
        const result = await target.query(
            `SELECT COUNT(*) AS count FROM \`${row.table}\``,
            {type: QueryTypes.SELECT}
        );
        row.targetCount = Number(result[0]?.count || 0);
    }
}

async function main() {
    if (!fs.existsSync(path.join(__dirname, '..', '.env'))) {
        console.warn('No .env file found in car_sa_backend. The migration script will only use shell environment variables.');
    }

    const {source, target} = buildConnections();

    console.log('Starting PostgreSQL -> MySQL migration with:');
    console.log(`- source PostgreSQL: ${maskValue(process.env.PG_HOST)}:${maskValue(process.env.PG_PORT || 5432)}/${maskValue(process.env.PG_DB_NAME)} as ${maskValue(process.env.PG_USER)}`);
    console.log(`- target MySQL: ${maskValue(process.env.DB_HOST)}:${maskValue(process.env.DB_PORT || 3306)}/${maskValue(process.env.DB_NAME)} as ${maskValue(process.env.DB_USER)}`);
    console.log(`- batch size: ${DEFAULT_BATCH_SIZE}`);

    try {
        await source.authenticate();
        await target.authenticate();

        await ensureTargetTablesExist(target);
        await assertTargetIsEmptyOrTruncate(target);

        const sourceTables = await fetchExistingSourceTables(source);
        const tablesToMigrate = TABLES.filter((table) => {
            if (sourceTables.has(table.name)) {
                return true;
            }

            if (SHOULD_SKIP_MISSING_SOURCE_TABLES) {
                console.warn(`- ${table.name}: source table not found in PostgreSQL schema "${PG_SCHEMA}", skipping.`);
                return false;
            }

            throw new Error(`Source table "${table.name}" was not found in PostgreSQL schema "${PG_SCHEMA}".`);
        });

        await target.query('SET FOREIGN_KEY_CHECKS = 0');
        const summaryRows = [];

        try {
            for (const table of tablesToMigrate) {
                const result = await migrateTable({
                    source,
                    target,
                    tableName: table.name,
                    primaryKey: table.primaryKey,
                });
                await resetAutoIncrement(target, table.name, table.primaryKey);
                summaryRows.push(result);
            }
        } finally {
            await target.query('SET FOREIGN_KEY_CHECKS = 1');
        }

        await verifyCounts(target, summaryRows);

        console.log('\nMigration summary:');
        for (const row of summaryRows) {
            console.log(`- ${row.table}: PostgreSQL=${row.totalRows}, MySQL=${row.targetCount}`);
        }

        console.log('\nMigration completed successfully.');
        console.log('Remember to copy the uploads directory as well if your PostgreSQL data references uploaded files.');
    } finally {
        await Promise.allSettled([source.close(), target.close()]);
    }
}

main().catch((error) => {
    console.error('\nMigration failed.');
    console.error(error.message || error);
    process.exitCode = 1;
});
