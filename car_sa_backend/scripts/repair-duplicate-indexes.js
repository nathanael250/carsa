#!/usr/bin/env node
// Dry run by default. Only repairs the four unique indexes formerly declared
// inline, which Sequelize's alter synchronization duplicated on each startup.
const path = require('path');
require('dotenv').config({path: path.join(__dirname, '..', '.env'), quiet: true});
const {sequelize} = require('../src/config/database');

const targets = [
    ['email_verifications', 'token'],
    ['users', 'email'],
    ['vehicles', 'vin'],
    ['vehicles', 'license_plate'],
];

async function main() {
    if (sequelize.getDialect() !== 'mysql') throw new Error('This repair requires MySQL.');
    const apply = process.argv.includes('--apply');
    const quote = (name) => sequelize.getQueryInterface().quoteIdentifier(name);
    const statements = [];
    for (const [table, column] of targets) {
        const [rows] = await sequelize.query(
            `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SUB_PART, INDEX_TYPE, COLLATION
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
             ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
            {replacements: [table]},
        );
        const groups = new Map();
        for (const row of rows) {
            if (!groups.has(row.INDEX_NAME)) groups.set(row.INDEX_NAME, []);
            groups.get(row.INDEX_NAME).push(row);
        }
        // Exclude primary, composite, prefix, expression and non-unique indexes.
        const matches = [...groups].filter(([name, fields]) => name !== 'PRIMARY'
            && fields.length === 1 && Number(fields[0].NON_UNIQUE) === 0
            && fields[0].COLUMN_NAME === column && fields[0].SUB_PART === null
            && fields[0].INDEX_TYPE === 'BTREE' && fields[0].COLLATION === 'A')
            .map(([name]) => name).sort((a, b) => a.length - b.length || a.localeCompare(b));
        if (groups.has(column) && !matches.includes(column)) {
            throw new Error(`${table}.${column}: named index has a different definition; inspect manually.`);
        }
        if (!matches.length) continue;
        const keep = matches.includes(column) ? column : matches[0];
        for (const name of matches.filter((name) => name !== keep)) {
            statements.push(`ALTER TABLE ${quote(table)} DROP INDEX ${quote(name)};`);
        }
        if (keep !== column) {
            statements.push(`ALTER TABLE ${quote(table)} RENAME INDEX ${quote(keep)} TO ${quote(column)};`);
        }
    }
    console.log(`${apply ? 'Applying' : 'Previewing'} ${statements.length} index repairs; table rows are unchanged.`);
    for (const sql of statements) {
        console.log(sql);
        if (apply) await sequelize.query(sql);
    }
    if (!apply && statements.length) console.log('Run npm run db:repair-indexes -- --apply to apply this repair.');
}

main().catch((error) => {
    console.error(error.original?.sqlMessage || error.message);
    process.exitCode = 1;
}).finally(() => sequelize.close());
