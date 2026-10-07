# Car SA Backend (Single Controller)

This backend now follows the **single master controller** pattern (like `transpipe-backend`).
All requests go through **one endpoint** and are routed by a command header.

**Endpoint**
- `POST /`

**Headers**
- `req`: command name (required)
- `apiKey`: optional; required only if `API_KEY` is set in env
- `Authorization: Bearer <token>` for authenticated commands

**Request body**
Use a wrapped payload to pass body/params/query:
```json
{
  "body": { },
  "params": { },
  "query": { }
}
```

If a command only needs `body`, send just `body`. The server will default missing `params/query` to `{}`.

## Examples

**Login**
```bash
curl -X POST http://localhost:5001/ \
  -H "req: LOGIN" \
  -H "Content-Type: application/json" \
  -d '{"body":{"email":"user@example.com","password":"secret"}}'
```

**List Service Catalog**
```bash
curl -X POST http://localhost:5001/ \
  -H "req: LIST_SERVICE_CATALOGS" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query":{"interval_type":"days","limit":100}}'
```

**Create Service**
```bash
curl -X POST http://localhost:5001/ \
  -H "req: CREATE_SERVICE" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"body":{"vehicle_id":1,"service_catalog_id":2,"garage_id":3}}'
```

**Upload Single File**
```bash
curl -X POST http://localhost:5001/ \
  -H "req: UPLOAD_SINGLE" \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/file.png"
```

## Garage Admin Onboarding (Self-Register)
Garage admins can self-register with `REGISTER_USER` by providing `role: "garage_admin"` plus `garage` and `documents`.

```bash
curl -X POST http://localhost:5001/ \
  -H "req: REGISTER_USER" \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "name": "Garage Admin",
      "email": "admin@garage.com",
      "password": "Temp1234",
      "role": "garage_admin",
      "garage": {
        "name": "My Garage",
        "address": "123 Main St",
        "city": "Kigali",
        "country": "Rwanda",
        "registration_number": "REG-123"
      },
      "documents": [
        {"type": "registration", "file_path": "/uploads/doc1.pdf"},
        {"type": "license", "file_path": "/uploads/doc2.pdf"}
      ]
    }
  }'
```

Garage admin accounts are created as `approved = false` and must be approved by `super_admin` before login.

## Commands
All commands are defined in:
- `src/config/commands.js`
- `src/config/permissions.js`

## Roles
The system supports four roles:
- `super_admin`: full system access (manage garages, approve garage admins, view all data).
- `garage_admin`: manages a single garage and its service technicians; views garage work orders.
- `service_technician`: handles service operations (register owners/vehicles, create/update work orders).
- `car_owner`: views personal service history and job status.

See `docs/garage-admin-activities.md` for the garage admin activity scope.

## Environment Variables
- `PORT` (default 5001)
- `JWT_SECRET` (required for auth)
- `API_KEY` (optional; if set, `apiKey` header is required)
- `TRANSPIP_PAYMENTS_URL` (optional; defaults to `https://payments.transpip.com`)
- `TRANSPIP_COMMON_API_KEY` (required for service payment collections)
- `TRANSPIP_TENANT_API_KEY` (required for service payment collections)
- `TRANSPIP_PAYMENT_TIMEOUT_MS` (optional; defaults to `15000`)
- `TRANSPIP_WEBHOOK_SECRET` (optional; if set, TransPip webhooks must send it as `x-webhook-secret`, `x-transpip-webhook-secret`, or `?token=...`)
- `DB_DIALECT` (default `mysql`)
- `DB_HOST`
- `DB_PORT` (default `3306`)
- `DB_NAME`
- `DB_USER`
- `DB_PASS`

## Data Migration Note
If you already had users with role `mechanic`, update them:
```sql
UPDATE users SET role = 'service_technician' WHERE role = 'mechanic';
```

## Database
This backend is configured to use MySQL by default through Sequelize. Install `mysql2`, create the target MySQL database, then set:

```env
DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=car_sa
DB_USER=root
DB_PASS=your_password
```

On startup, Sequelize will run `sync({ alter: true })` against that MySQL database.

## PostgreSQL -> MySQL Migration
### Repairing “Too many keys specified” on startup

Older models declared `unique: true` directly on email, verification token,
VIN, and license plate attributes. With `sync({alter: true})`, Sequelize added
another MySQL unique index on each startup, eventually reaching the 64-index
limit. These rules now use explicitly named model indexes so repeated syncs
reuse the same indexes.

For another database that still has the old duplicate indexes, stop the backend
and run from `car_sa_backend`:

```bash
npm run db:repair-indexes             # Preview the repair
npm run db:repair-indexes -- --apply  # Apply it
npm run dev
```

The repair uses the database configured in `.env`. It retains one complete
unique index per affected column and removes only equivalent copies. It does
not delete records or remove primary keys, composite indexes, or foreign keys.
Running it again after a successful repair makes no further changes.

### Ready-to-import MySQL copy of the saved backup

`mysql/car_sa_backup_mysql.sql` is a MySQL copy of `car_sa_backup.dump`, whose
snapshot was taken on **March 19, 2026 at 00:34:17 CAT**. It includes all 12
original tables and all 24 saved rows:

| Table | Rows |
| --- | ---: |
| business_docs | 8 |
| car_register_requests | 0 |
| email_verifications | 2 |
| garages | 2 |
| next_service_due | 0 |
| notifications | 0 |
| service_catalog | 9 |
| service_logs | 0 |
| service_requests | 0 |
| services | 0 |
| users | 3 |
| vehicles | 0 |

Use MySQL **8.0.16 or newer**. From `car_sa_backend`, import into an empty
database before starting the backend:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS car_sa CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;"
mysql -u root -p car_sa < mysql/car_sa_backup_mysql.sql
```

The SQL uses the database selected by the client, so a different empty database
name can be used to restore a separate copy. It contains no database deletion,
table deletion, or overwrite commands. Existing tables cause an import error;
do not use `--force` to continue past errors. Database user creation and grants
remain separate in `mysql/create_database.sql`.

The conversion preserves IDs, password hashes, nulls, timestamps (normalized to
UTC with microsecond precision), unique rules, all 24 foreign keys, and the next
sequence IDs as MySQL `AUTO_INCREMENT` values. PostgreSQL enums become MySQL
enums and text becomes `LONGTEXT`. Repeated identical unique constraints were
consolidated. String columns use `utf8mb4_0900_bin` for case-sensitive comparison.
Inserted strings use UTF-8 hex expressions to preserve their contents exactly.

Validation: imported successfully into an isolated MySQL 9.6 database; all 12
tables, 24 rows, and 240 field values matched the decoded source backup. All 24
foreign keys were added with validation enabled, and next IDs were checked.

This file reproduces the saved schema, rather than adding newer application
fields or records. The current backend has newer model definitions that it
applies through Sequelize synchronization when started. Uploaded files are not
contained in a database backup. The saved vehicle and service tables are empty;
later records cannot be recovered from this snapshot.

### Migrating from a running PostgreSQL database

If you already created a PostgreSQL backup and want to move all backend data into MySQL:

1. Restore the PostgreSQL dump into a temporary PostgreSQL database.
```bash
createdb -U postgres car_sa_restore
pg_restore -U postgres -d car_sa_restore car_sa_backup.dump
```

2. Point the backend `.env` to MySQL and start the backend once so Sequelize creates the MySQL tables.

3. Install backend dependencies so both `mysql2` and `pg` are available.
```bash
npm install
```

4. Run the migration script with PostgreSQL source credentials.
```bash
PG_HOST=127.0.0.1 \
PG_PORT=5432 \
PG_DB_NAME=car_sa_restore \
PG_USER=postgres \
PG_PASS=your_postgres_password \
npm run migrate:pg-to-mysql
```

Optional migration flags:
- `MIGRATION_BATCH_SIZE=500` to control batch size
- `MIGRATION_TRUNCATE_TARGET=true` to clear MySQL tables before importing
- `MIGRATION_SKIP_MISSING_SOURCE_TABLES=true` to skip tables that do not exist in the restored PostgreSQL database

The migration script:
- copies table data from PostgreSQL to MySQL in dependency-safe order
- preserves IDs, foreign keys, timestamps, and password hashes
- resets MySQL `AUTO_INCREMENT` after each table
- prints PostgreSQL/MySQL row counts at the end

Important:
- the MySQL schema must already exist before running the migration
- the script only migrates database rows, not uploaded files on disk
- if your records reference files in `uploads/`, copy that folder too

## Frontend
Set frontend base URL to the server root (not `/api`):
```
VITE_API_BASE_URL=http://localhost:5001
VITE_API_KEY=<optional if API_KEY is set>
```
