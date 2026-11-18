/**
 * Creates the testing database (if missing), its tables, and test accounts and data.
 *
 *   npm run db:seed:testing      (reads .env.testing)
 *
 * Safe to run again: existing test records are updated, nothing else is touched.
 * Refuses to run unless APP_ENV=testing and DB_NAME contains "test".
 * The accounts and password are written to testing-accounts.txt (ignored by git).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {environment} = require('../src/config/env');

if (environment !== 'testing') {
    console.error('Refusing to run: this script only works with APP_ENV=testing. Use: npm run db:seed:testing');
    process.exit(1);
}

const DB_NAME = process.env.DB_NAME;
if (!/^[A-Za-z0-9_]+$/.test(DB_NAME || '')) {
    console.error(`Refusing to run: unexpected database name "${DB_NAME}".`);
    process.exit(1);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(Date.now() - days * DAY_MS);
const REFERRAL_CODE = 'RSTEST01';

async function createDatabase() {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();
}

async function main() {
    await createDatabase();

    // Loaded only after the settings are read and the database exists.
    const bcrypt = require('bcrypt');
    const {sequelize} = require('../src/config/database');
    const User = require('../src/models/User');
    const Garage = require('../src/models/Garage');
    const BusinessDocument = require('../src/models/BusinessDocument');
    const Vehicle = require('../src/models/Vehicle');
    const ServiceCatalog = require('../src/models/ServiceCatalog');
    const OilProduct = require('../src/models/OilProduct');
    const Service = require('../src/models/Service');
    const Reseller = require('../src/models/Reseller');
    require('../src/models/CarRegisterRequest');
    require('../src/models/Notification');
    require('../src/models/EmailVerification');
    require('../src/models/PushDeviceToken');
    require('../src/models/VehicleTransfer');
    require('../src/models/OilChangeReminder');

    await sequelize.sync({alter: true});

    const password = process.env.TEST_USERS_PASSWORD || crypto.randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 10);

    const upsertUser = async (values) => {
        const fields = {
            password_hash: passwordHash,
            email_verified: true,
            approved: true,
            active: true,
            ...values,
        };
        const existing = await User.findOne({where: {email: values.email}});
        return existing ? existing.update(fields) : User.create(fields);
    };

    const upsertGarage = async (owner, values) => {
        const [garage] = await Garage.findOrCreate({
            where: {owner_user_id: owner.id, name: values.name},
            defaults: {country: 'Rwanda', ...values},
        });
        await BusinessDocument.findOrCreate({
            where: {garage_id: garage.id, doc_type: 'national_id'},
            defaults: {file_path: '/uploads/test-id-document.pdf'},
        });
        await owner.update({garage_id: garage.id});
        return garage;
    };

    // Accounts: one for every role
    const superAdmin = await upsertUser({name: 'Test Super Admin', email: 'admin@carsa.test', phone: '0780000001', role: 'super_admin'});
    const reseller = await upsertUser({name: 'Test Reseller', email: 'reseller@carsa.test', phone: '0780000002', role: 'reseller'});
    await Reseller.findOrCreate({
        where: {user_id: reseller.id},
        defaults: {referral_code: REFERRAL_CODE, commission_type: 'percentage', commission_value: 10, notes: 'Test account'},
    });

    const garageAdmin = await upsertUser({
        name: 'Test Garage Admin',
        email: 'garage@carsa.test',
        phone: '0780000003',
        role: 'garage_admin',
        referred_by_reseller_id: reseller.id,
        referred_at: daysAgo(120),
    });
    const garage = await upsertGarage(garageAdmin, {name: 'Test Garage Kigali', address: 'KN 1 Ave', city: 'Kigali', registration_number: 'TEST-001'});

    const technician = await upsertUser({
        name: 'Test Technician',
        email: 'technician@carsa.test',
        phone: '0780000004',
        role: 'service_technician',
        garage_id: garage.id,
    });
    const carOwner = await upsertUser({name: 'Test Car Owner', email: 'owner@carsa.test', phone: '0780000005', role: 'car_owner'});
    const buyer = await upsertUser({name: 'Test Car Buyer', email: 'buyer@carsa.test', phone: '0780000006', role: 'car_owner'});

    // Waits in the admin panel's Approvals list, to test approving a garage.
    const pendingAdmin = await upsertUser({
        name: 'Test Pending Garage',
        email: 'pending@carsa.test',
        phone: '0780000007',
        role: 'garage_admin',
        approved: false,
    });
    await upsertGarage(pendingAdmin, {name: 'Test Pending Garage', city: 'Musanze', registration_number: 'TEST-002'});

    // Service types and oil products the garage screens need
    const catalogItems = [
        {name: 'Engine oil change', interval_type: 'days', recommended_interval_days: 90, service_kind: 'engine_oil_change'},
        {name: 'Gearbox oil change', interval_type: 'km', recommended_interval_km: 40000, service_kind: 'gearbox_oil_change'},
        {name: 'Brake inspection', interval_type: 'days', recommended_interval_days: 180},
        {name: 'Tire rotation', interval_type: 'km', recommended_interval_km: 10000},
    ];
    const catalogs = {};
    for (const item of catalogItems) {
        const [catalog] = await ServiceCatalog.findOrCreate({where: {name: item.name}, defaults: item});
        catalogs[item.name] = catalog;
    }
    const [oil] = await OilProduct.findOrCreate({
        where: {name: 'Test Engine Oil 5W-30'},
        defaults: {brand: 'TestOil', grade: '5W-30', category: 'engine_oil'},
    });

    // Cars
    const [vehicle] = await Vehicle.findOrCreate({
        where: {license_plate: 'RAT001A'},
        defaults: {owner_id: carOwner.id, make: 'Toyota', model: 'RAV4', year: 2018, fuel_type: 'petrol'},
    });
    await Vehicle.findOrCreate({
        where: {license_plate: 'RAT002B'},
        defaults: {owner_id: carOwner.id, make: 'Honda', model: 'Fit', year: 2015, fuel_type: 'petrol'},
    });

    // A paid oil change 85 days ago: earns the reseller a commission and is due for a reminder soon.
    const paidAt = daysAgo(85);
    const [service] = await Service.findOrCreate({
        where: {payment_collection_id: 'test-seed-oil-change'},
        defaults: {
            vehicle_id: vehicle.id,
            garage_id: garage.id,
            service_catalog_id: catalogs['Engine oil change'].id,
            performed_by_user_id: technician.id,
            oil_product_id: oil.id,
            status: 'completed',
            started_at: paidAt,
            completed_at: paidAt,
            mileage_at_service: 60000,
            next_service_mileage: 65000,
            actual_cost: 20000,
            payment_status: 'SUCCESS',
            payment_phone: '0780000005',
            payment_amount: 20000,
            paid_at: paidAt,
        },
    });
    await Reseller.recordCommissionForService(service);

    const accounts = [
        ['Super admin (admin panel)', superAdmin.email],
        ['Garage admin (app + admin panel)', garageAdmin.email],
        ['Technician (app)', technician.email],
        ['Car owner (app), owns RAT001A + RAT002B', carOwner.email],
        ['Car buyer (app), for testing transfers', buyer.email],
        [`Reseller (app), code ${REFERRAL_CODE}`, reseller.email],
        ['Garage waiting for approval (cannot log in yet)', pendingAdmin.email],
    ];
    const lines = [
        `CarSa TEST accounts, database "${DB_NAME}". Generated ${new Date().toISOString()}.`,
        'Never use these on production. This file is ignored by git.',
        '',
        `Password for all accounts: ${password}`,
        '',
        ...accounts.map(([label, email]) => `${email.padEnd(26)} ${label}`),
        '',
    ];
    const outputFile = path.join(__dirname, '..', 'testing-accounts.txt');
    fs.writeFileSync(outputFile, lines.join('\n'), {mode: 0o600});

    console.log(`Database "${DB_NAME}" is ready with ${accounts.length} test accounts.`);
    console.log(`Accounts and password: ${outputFile}`);
    await sequelize.close();
}

main().catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exit(1);
});
