# VulnLab — Front-End (wired to backend)

Risk-aware automated web application vulnerability assessment system.
React + Vite front-end. Login/signup now go through the Flask backend.

## Running the full app (needs BOTH)

You must run the backend AND the frontend at the same time, in two terminals.

### Terminal 1 — backend
```
cd vulnlab-backend
venv\Scripts\activate
python app.py
```
Leave it running at http://localhost:5000

### Terminal 2 — frontend
```
cd vulnlab
npm install
npm run dev
```
Opens http://localhost:5173

## What's real now
- Signup/login/account update call the backend (Flask + database).
- Passwords are hashed with bcrypt server-side.
- A JWT token is stored in the browser and sent on each request.

## What's still mock (until Stage 2)
- Scans, schedules, reports still use browser localStorage (src/lib/store.js).
- These get wired to the backend when ZAP scanning is added.

## Troubleshooting
- "Cannot reach the server" on login → the backend isn't running. Start Terminal 1.
- Accounts you made under the OLD mock system won't work anymore — create a new
  account now that signup goes to the real database.

## Design system
Dark security-ops theme, cyan (#00D9FF). Inter (UI) + JetBrains Mono (data).
