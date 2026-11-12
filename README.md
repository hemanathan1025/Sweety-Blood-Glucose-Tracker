# Sweety Blood Glucose Tracker

A responsive React app and Node/Express API for a patient to record glucose readings and view date-based reports. Each reading belongs to the authenticated user. The app is an assignment project, not a medical device or treatment recommendation.

## Features

- Registration/login with bcrypt password hashes and JWT-protected endpoints.
- Create, list, view, update, and delete readings scoped to the signed-in user.
- Validates integer readings from 40–600 mg/dl, the four permitted time slots, duplicate slots, daily limit, and future dates.
- Daily, month-to-date, and previous-calendar-month reports with empty states.
- Calendar date checks use Asia/Kolkata. Reading, daily, and month-to-date dates cannot be future-dated; the previous-month report accepts any valid selector date, including a future date, and returns the full calendar month before it.
- Responsive React screens with loading, success, and error feedback.

## Structure

```text
backend/   Express API, PostgreSQL pool, additive migration, seed, tests
frontend/  React/Vite app and frontend validation tests
```

## Requirements and setup

Install Node.js 20.19+ and PostgreSQL 18. The application uses the existing `sweety_db` database and its `users` and `health_records` tables. It does not recreate those tables.

1. Copy `backend/.env.example` to `backend/.env` and enter your local PostgreSQL settings and JWT secret. Do not commit `.env`.
2. In a terminal, install and start the backend:

   ```powershell
   cd backend
   npm install
   npm run db:migrate
   npm run dev
   ```

3. In a second terminal, install and start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173`.

## Start the full app with Docker

Docker Compose starts PostgreSQL, the API, and the production frontend. From the project root:

```powershell
Copy-Item .env.example .env
# Edit .env and replace DB_PASSWORD and JWT_SECRET with private values.
docker compose up --build -d
docker compose ps
```

Open `http://localhost:8080`. A new PostgreSQL volume is initialized with the app's existing `users` and `health_records` structure, and the existing additive migration runs when the backend starts. PostgreSQL data persists in the `postgres_data` volume. Stop the services with `docker compose down`; this keeps the database volume. Do not commit `.env`.

The frontend talks to the API at `http://localhost:5000/api`. Change `BACKEND_PORT` in `.env` if port 5000 is already in use.

The backend defaults to `http://localhost:5000/api`. Set `VITE_API_URL` in `frontend/.env` only if the API uses a different URL. Placeholder values for the environment are in each folder’s `.env.example`.

## Database migration and seed

The verified database has only `users` and `health_records`; the table already has a foreign key, slot check, and unique `(user_id, reading_date, time_slot)` index. The additive migration validates integer glucose values from 40 through 600 mg/dl. It never drops tables or changes existing rows. Run it with `npm run db:migrate` from `backend/`.

To create a development demo user and sample records, set `SEED_DEMO_EMAIL` and `SEED_DEMO_PASSWORD` in the ignored `backend/.env`, then run `npm run db:seed`. The script hashes the password and does not overwrite an existing account or readings. Keep the demo password local; it is not included here.

## Tests and build

Backend tests use the configured PostgreSQL database and create uniquely named temporary accounts. They delete only records/users created by that test. Do not point the tests at production data.

```powershell
cd backend
npm test
```

Frontend validation tests and production build:

```powershell
cd frontend
npm test
npm run build
```

## Date and timezone rules

The application uses the Asia/Kolkata calendar date for reading validation and daily/month-to-date reports. Those dates cannot be in the future. The previous-calendar-month report accepts any valid date as a selector, including a future date, because it reports the complete month before the selected month. For example, selecting 15 January 2027 requests 1–31 December 2026.

## API

Private routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API process health |
| GET | `/api/db` | Live `SELECT 1` database check |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/health-records` | Create reading |
| GET | `/api/health-records` | List own readings (`date`, `from`, `to`, `page`, `limit`) |
| GET | `/api/readings` | Readings collection alias with pagination |
| GET | `/api/health-records/:id` | Read one owned reading |
| PUT | `/api/health-records/:id` | Update owned reading |
| DELETE | `/api/health-records/:id` | Delete owned reading |
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily detail and summary |
| GET | `/api/reports/month-to-date?date=YYYY-MM-DD` | First of month through selected date |
| GET | `/api/reports/monthly?date=YYYY-MM-DD` | Entire previous calendar month |

Reading request body:

```json
{
  "reading_date": "2026-11-10",
  "time_slot": "Morning",
  "glucose_value": 105
}
```

Allowed slots are `Morning`, `After breakfast`, `After lunch`, and `After dinner`.

Reading list responses include `readings`, `currentPage`, `limit`, `totalReadings`, and `totalPages`. The prior `items`, `page`, and `total` fields remain available for existing clients.

## Assumptions and future improvements

- The live database schema was inspected; it has no `updated_at` column on `health_records`, so updates preserve the existing schema rather than adding an unrequested column.
- No device provider/API is configured. This version supports manual fallback entry and does not claim to automatically collect device readings.
- Optional charting, automated provider authorization, and broader browser component tests can be added after the required assignment flows.

## Demo and GitHub submission

For a 2–3 minute screen recording, show registration, login, adding readings in multiple slots, editing/deleting a reading, the daily and monthly reports, and the empty state. Keep `.env`, database credentials, JWT secrets, and real health data out of the recording and repository.

Before pushing, check `git status`, confirm the ignored environment files and `node_modules` are not staged, then commit the source, tests, migrations, README, and `.env.example` files. Submit the public GitHub repository URL with the screenshots or recording requested by Kenpath.
