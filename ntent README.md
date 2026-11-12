warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/README.md b/README.md[m
[1mindex 0461139..9975736 100644[m
[1m--- a/README.md[m
[1m+++ b/README.md[m
[36m@@ -42,23 +42,6 @@[m [mInstall Node.js 20.19+ and PostgreSQL 18. The application uses the existing `swe[m
 [m
 4. Open `http://localhost:5173`.[m
 [m
[31m-## Start the full app with Docker[m
[31m-[m
[31m-Docker Compose starts PostgreSQL, the API, and the production frontend. From the project root:[m
[31m-[m
[31m-```powershell[m
[31m-Copy-Item .env.example .env[m
[31m-# Edit .env and replace DB_PASSWORD and JWT_SECRET with private values.[m
[31m-docker compose up --build -d[m
[31m-docker compose ps[m
[31m-```[m
[31m-[m
[31m-Open `http://localhost:8080`. A new PostgreSQL volume is initialized with the app's existing `users` and `health_records` structure, and the existing additive migration runs when the backend starts. PostgreSQL data persists in the `postgres_data` volume. Stop the services with `docker compose down`; this keeps the database volume. Do not commit `.env`.[m
[31m-[m
[31m-The frontend talks to the API at `http://localhost:5000/api`. Change `BACKEND_PORT` in `.env` if port 5000 is already in use.[m
[31m-[m
[31m-The backend defaults to `http://localhost:5000/api`. Set `VITE_API_URL` in `frontend/.env` only if the API uses a different URL. Placeholder values for the environment are in each folder’s `.env.example`.[m
[31m-[m
 ## Database migration and seed[m
 [m
 The verified database has only `users` and `health_records`; the table already has a foreign key, slot check, and unique `(user_id, reading_date, time_slot)` index. The additive migration validates integer glucose values from 40 through 600 mg/dl. It never drops tables or changes existing rows. Run it with `npm run db:migrate` from `backend/`.[m
