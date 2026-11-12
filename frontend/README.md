# Sweety frontend

## Run the client

From the project root, install the frontend dependencies and start Vite:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. The client uses React Router for `/login`, `/signup`, and the protected `/dashboard` route. Axios sends the stored JWT as a Bearer token.

The default API URL is `http://localhost:5000/api`. To use another API origin, copy `.env.example` to `.env` in `frontend/` and set `VITE_API_URL`, for example:

```env
VITE_API_URL=http://localhost:5000/api
```

The client uses the existing Express routes under `/api/auth`, `/api/health-records`, and `/api/reports`.
