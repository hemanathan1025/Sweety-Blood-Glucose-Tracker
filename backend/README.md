# Sweety Blood Glucose Tracker

A small full-stack application for recording glucose readings and viewing daily and monthly summaries. Readings and profiles are private to the authenticated user. This project is an assignment implementation, not a medical device or treatment recommendation.

## Stack

- React and Vite frontend
- Node.js, Express, and PostgreSQL (`pg`) backend
- JWT authentication and bcrypt password hashing
- PostgreSQL database: `sweety_db`

## Project structure

```text
backend/
  database/
    migrations/
    migrate.js
    seed.js
  src/
    config/
    controllers/
    middleware/
    routes/
    services/
    validators/
    utils/
  tests/
  .env.example
  package.json
  src/server.js
frontend/
  src/
  package.json
```

## PostgreSQL setup

The application uses the existing `users` and `health_records` tables. It does not recreate either table. Confirm that PostgreSQL is running and that the local environment values point to `sweety_db`.

Copy `backend/.env.example` to `backend/.env` and enter the existing PostgreSQL password locally. Never commit `.env` or paste its values into chat. The additive migration adds and validates a glucose value constraint; it does not drop tables or records.

From `backend/`, run:

```sh
npm install
npm run db:migrate
```

The migration can be rerun safely. It validates glucose values as whole numbers from 40 through 600 mg/dl. The existing database already has the valid time-slot check and unique `(user_id, reading_date, time_slot)` index.

## Environment variables

`backend/.env.example` lists all backend settings. Required runtime variables are `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `JWT_SECRET`. `PORT`, `CORS_ORIGIN`, `DB_POOL_MAX`, and `JWT_EXPIRES_IN` have defaults or optional values. Seed settings are only used by the seed script.

## Start and test the backend

From `backend/`:

```sh
npm run dev
```

The API listens on port `5000` by default. Run tests with:

```sh
npm test
```

Test fixtures use unique temporary accounts and remove only those fixtures after the integration tests. Do not run the tests against a production database.

## How a backend request works

1. A route matches the URL and HTTP method. Private routes check the JWT first.
2. A controller reads the request and sends the response.
3. A service applies the app rules, checks record ownership, and talks to PostgreSQL.
4. Validators check user input. Error middleware returns a clear error response.

Folder guide: `routes` maps URLs, `controllers` handles HTTP, `services` holds app rules and SQL, `middleware` checks auth and errors, `validators` checks input, and `config/db.js` connects to PostgreSQL.

## API

Private endpoints require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API process health |
| GET | `/api/db` | Live PostgreSQL connectivity check (`SELECT 1`) |
| POST | `/api/auth/register` | Register with name, email, password |
| POST | `/api/auth/login` | Sign in and receive a JWT |
| GET | `/api/auth/me` | Read the current profile |
| PUT | `/api/auth/me` | Update the current user name |
| POST | `/api/health-records` | Create a glucose reading |
| GET | `/api/health-records` | List the current user's readings; accepts `date`, `from`, `to`, `page`, and `limit` |
| GET | `/api/readings` | Alias for the paginated readings collection |
| GET | `/api/health-records/:id` | Read one owned reading |
| PUT | `/api/health-records/:id` | Update an owned reading |
| DELETE | `/api/health-records/:id` | Delete an owned reading |
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily readings and summary |
| GET | `/api/reports/month-to-date?date=YYYY-MM-DD` | First of month through selected date |
| GET | `/api/reports/monthly?date=YYYY-MM-DD` | Full previous calendar month |

Reading bodies use `reading_date` (`YYYY-MM-DD`), `time_slot` (`Morning`, `After breakfast`, `After lunch`, `After dinner`), and `glucose_value` (integer mg/dl, 40–600). The database unique index and slot check prevent duplicate slots and a fifth distinct slot for the same user and date. The API serializes a user's create operations to make the four-reading limit safe under concurrent requests.

## Demo seed

Set `SEED_DEMO_EMAIL` and `SEED_DEMO_PASSWORD` in the ignored local `.env`, then run:

```sh
npm run db:seed
```

The script hashes the password with bcrypt, inserts a demo account only when the email is unused, and adds sample readings without overwriting existing rows. If that email already exists with a different password, seeding stops without changing it. Do not use real account credentials for the demo.

## Notes and assumptions

- The live schema was inspected before this implementation: only `users` and `health_records` are present. Existing readings were empty when checked; existing slot and uniqueness constraints were verified.
- The app stores glucose records with `metric_type = 'glucose'` and `unit = 'mg/dl'`.
- Report averages are rounded to one decimal place. Empty report periods return a zero count and null measurements.
- Calendar date validation uses Asia/Kolkata. Reading, daily, and month-to-date dates cannot be future-dated. A previous-month report accepts any valid selector date, including a future date, and summarizes the complete calendar month before it.
- No public device integration provider is configured. Manual entry is currently the available input path; future device integrations must use an authorized provider API and must not fabricate readings.
- Health data is sensitive. Keep credentials local and use a private database outside development.

## Demo recording

For a 2–3 minute walkthrough, show registration/login, add readings for two dates and different time slots, edit and delete a reading, open daily/month-to-date/previous-month reports, and show the empty state with a date that has no readings. Do not show `.env` or real user health information.

## GitHub checklist

- Review `git status` and confirm `.env` and `node_modules` are ignored.
- Commit source, migrations, tests, `.env.example`, and README only.
- Do not commit database passwords, JWT secrets, demo passwords, or real health records.
- Push the repository and include the repository URL plus screenshots or the recording when submitting.
