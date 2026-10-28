# Testing and Production environments

CarSa runs as two completely separate copies, so testing never touches live data.

| | Testing | Production (live) |
| --- | --- | --- |
| Database | its own, e.g. `carsa_test` (name **must** contain `test`) | `car_sa` |
| Backend address | e.g. `https://carsa-backend-test.transpip.com` | `https://carsa-backend.transpip.com` |
| Payments | TransPip test/sandbox keys | live keys |
| `JWT_SECRET` | its own value | its own value (different!) |
| Admin panel | testing build, red "Test environment" badge | normal build |
| Mobile app | testing build, red "TEST" corner banner | Play Store build |

## 1. Create the test database (once)

On the database server:

```sql
CREATE DATABASE carsa_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'carsa_test'@'%' IDENTIFIED BY 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON carsa_test.* TO 'carsa_test'@'%';
```

The tables are created automatically the first time the testing backend starts.
To start testing with realistic data, you can copy the live database into it (`mysqldump car_sa | mysql carsa_test`),
but remember it then contains real customers' details.

## 2. Backend

1. Copy the examples and fill them in:
   - `.env.testing.example` → `.env.testing` (test database, test keys, its own `JWT_SECRET`)
   - `.env.production.example` → `.env.production` (your current live values from `.env`)
2. Run each one as its own process, on its own port / domain:

```bash
npm run start:testing      # APP_ENV=testing    -> reads .env.testing
npm run start:production   # APP_ENV=production -> reads .env.production
```

Safety: the testing server **refuses to start** if its `DB_NAME` does not contain `test`.
Check which one you reached with `GET /health` — it answers `{"status":"ok","environment":"testing"}`.

Without `APP_ENV`, the server reads `.env` exactly as before, so the current live server keeps working unchanged.

## 3. Admin panel

1. Copy `.env.testing.example` → `.env.testing` and `.env.production.example` → `.env.production`, and set `VITE_API_BASE_URL`.
2. Build:

```bash
npm run build:testing   # testing panel (shows a red "Test environment" badge)
npm run build           # live panel
```

Deploy the testing build to its own address (e.g. `admin-test.…`).

## 4. Mobile app

1. Copy `env/testing.example.json` → `env/testing.json` and `env/production.example.json` → `env/production.json`.
2. Build with both the Firebase file and the environment file:

```bash
flutter build apk --release --dart-define-from-file=firebase.json --dart-define-from-file=env/testing.json
flutter build appbundle --release --dart-define-from-file=firebase.json --dart-define-from-file=env/production.json
```

Testing builds show a red "TEST" banner in the corner. Share them with testers directly (APK), and only upload
production builds to the Play Store.

The real `.env.testing`, `.env.production` and `env/*.json` files contain secrets and are ignored by git;
only the `*.example` files are committed.
