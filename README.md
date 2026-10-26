# VulnLab
Continuous risk-aware automated web application vulnerability assessment system
VulnLab

Continuous, risk-aware automated web application vulnerability assessment system.

VulnLab wraps OWASP ZAP in a full-stack web platform. It crawls and actively scans web applications, re-scores every finding with a transparent risk-aware scoring engine, explains each issue in plain English with AI, and runs scheduled scans automatically for continuous monitoring. Reports can be emailed when a scan finishes.

Built as my Final Year Project for the BSc (Hons) in Cyber Security (APU / De Montfort University).

📄 Read the full project report

Why VulnLab?

Scanners such as ZAP label findings with a fixed severity (High / Medium / Low). A severity label is not the same as real-world risk. A medium-severity issue on a login form can matter more than a high-severity one on a static page. VulnLab adds a scoring layer that also considers exploitability and exposure, so the most dangerous issues appear at the top of the list.

Features
Automated scanning with OWASP ZAP: target access → spider → AJAX spider → active scan → alert collection, driven through the ZAP API
Three scan modes
Mode	Crawl	Attack strength	Use case
Quick	Shallow (depth 2)	Low	Fast surface check: headers, misconfigurations, light injection probes
Deep	Full (depth 8 + AJAX)	High	Complete crawl and full attack
Targeted	None	High	Deep attack on one exact URL
Risk-aware scoring engine: converts ZAP's label into a 0–10 score and can promote a finding's severity band (up to critical)
AI explanations (Google Gemini): a "what / why / how to fix" explanation for each finding, plus an overall summary. The AI only explains; it never changes scores. If the AI call fails, built-in rule-based text is used instead.
Continuous monitoring: APScheduler checks every minute for due scans (Once / Daily / Weekly / Monthly / Custom interval)
Email reports: an HTML report is sent over SMTP when a scan completes
Dashboard & analytics: results, per-scan detail, trends over time, reports, and settings
Authentication: bcrypt-hashed passwords and JWT sessions
Demo mode: if ZAP isn't running, VulnLab returns realistic sample findings so the whole workflow can still be tried
Risk-Aware Scoring
score = base severity + exploitability bump + exposure bump      (clamped 0–10)
Factor	Logic
Base severity	ZAP High = 8.0 · Medium = 5.0 · Low = 2.5 · Info = 1.0
Exploitability	+1.5 for heavily exploited classes (SQLi, XSS, RCE, command injection, path traversal, file inclusion)
Exposure	+0.8 if the finding sits on a sensitive endpoint (login, auth, admin, search, API, upload, password)
Band promotion	≥ 9.0 → Critical · ≥ 7.0 → High · ≥ 4.0 → Medium

The engine is rule-based on purpose, so every score can be explained and audited.

Architecture
┌──────────────────────┐   REST + JWT   ┌──────────────────────────┐   ZAP API   ┌────────────┐
│  React + Vite (SPA)  │ ─────────────▶ │  Flask API               │ ──────────▶ │ OWASP ZAP  │
│  Dashboard, Results, │ ◀───────────── │  ├─ scan runner (thread) │ ◀────────── │  (daemon)  │
│  Trends, Scheduler   │   polls status │  ├─ risk scoring engine  │             └────────────┘
└──────────────────────┘                │  ├─ APScheduler          │
                                        │  ├─ Gemini explainer ────┼──▶ Google Gemini API
                                        │  └─ SMTP emailer ────────┼──▶ Email inbox
                                        └────────────┬─────────────┘
                                                     ▼
                                           PostgreSQL (SQLAlchemy)

Scan flow: the frontend starts a scan → gets a job_id → a background thread drives ZAP → each finding is scored → results are saved → AI explanations are added → the report is emailed → the frontend polls until the scan completes.

Tech Stack
Layer	Technologies
Frontend	React 18, React Router 6, Vite 5
Backend	Python, Flask 3, SQLAlchemy 2, APScheduler
Database	PostgreSQL (SQLite fallback for local dev)
Scanner	OWASP ZAP (python-owasp-zap-v2.4)
Security	bcrypt, PyJWT, CORS restricted to the frontend origin
AI	Google Gemini API
Email	SMTP (Mailtrap for development)
Project Structure
VulnLab/
├── backend/
│   ├── app.py              # Flask API routes
│   ├── auth.py             # JWT auth helpers
│   ├── config.py           # Env-based configuration
│   ├── db.py               # SQLAlchemy models (User, Scan, Vulnerability, Schedule, Setting)
│   ├── scheduler.py        # APScheduler – continuous scanning
│   ├── emailer.py          # HTML email reports
│   ├── ai_explainer.py     # Gemini plain-English explanations
│   ├── scanner/
│   │   ├── zap_client.py   # Drives OWASP ZAP (+ demo mode)
│   │   ├── scan_modes.py   # Quick / Deep / Targeted configs
│   │   ├── risk_scoring.py # Risk-aware scoring engine
│   │   └── runner.py       # Background scan jobs
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/          # Dashboard, Results, ScanDetail, Scheduled, Trends, Reports, Settings, Login, Signup
│   │   ├── components/     # Layout, Sidebar, ScanModal, ScheduleModal, Assistant, ...
│   │   └── lib/            # API client, auth, scans
│   └── package.json
└── docs/
    └── VulnLab_Report.pdf
Getting Started
Prerequisites
Python 3.10+
Node.js 18+
PostgreSQL (optional, defaults to SQLite)
Java 17+ and OWASP ZAP (optional, demo mode works without them)
1. Start OWASP ZAP (headless)
bash
zap.bat -daemon -port 8080 -config api.disablekey=true    # Windows
zap.sh  -daemon -port 8080 -config api.disablekey=true    # Linux/macOS

api.disablekey=true is for local development only. Set a real API key in production.

2. Backend
bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows  (Linux/macOS: source venv/bin/activate)
pip install -r requirements.txt
cp .env.example .env             # then fill in your values
python app.py                    # http://localhost:5000

Check GET /api/health. It should return "zap_available": true when ZAP is reachable.

3. Frontend
bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
Configuration (backend/.env)
Variable	Purpose
DATABASE_URL	PostgreSQL connection string (falls back to SQLite)
JWT_SECRET	Long random string used to sign tokens
CORS_ORIGIN	Frontend origin (default http://localhost:5173)
ZAP_API_URL / ZAP_API_KEY	ZAP daemon address and key
SMTP_*	Email report settings (optional)
GEMINI_API_KEY	AI explanations (optional; falls back to rule-based text)
API Overview
Method	Endpoint	Description
GET	/api/health	Service + ZAP status
POST	/api/auth/signup · /api/auth/login	Register / log in
GET · PATCH	/api/auth/me · /api/auth/account	Current user / update account
POST	/api/scans	Start a scan → job_id
GET	/api/scans/status/<job_id>	Live progress
GET	/api/scans · /api/scans/<id>	Scan history / scan detail
GET · POST	/api/schedules	List / create scheduled scans
PATCH · DELETE	/api/schedules/<id>	Update / delete a schedule
GET · PATCH	/api/settings	User settings
Screenshots

Add screenshots to docs/screenshots/ and they'll render here.

Dashboard	Scan Detail
Dashboard	Scan detail
Scheduled Scans	Trends
Scheduled	Trends
Limitations & Future Work
Background jobs use threads and an in-memory registry. A production setup would use Celery or RQ with a message broker.
Scoring is rule-based. Future versions could add exploit-database lookups (e.g. EPSS/KEV) or ML-based prioritisation.
Authenticated scanning (logged-in areas of target apps) is not yet supported.
Continuous monitoring needs the backend running on an always-on server.
⚠️ Legal & Ethical Use

Only scan applications you own or have explicit written permission to test. Unauthorised scanning is illegal in most countries (e.g. Malaysia's Computer Crimes Act 1997, the UK's Computer Misuse Act 1990). For practice, use deliberately vulnerable targets such as testphp.vulnweb.com, OWASP Juice Shop, or DVWA.

Author

Ahmed Khalid, BSc (Hons) Cyber Security, APU / De Montfort University GitHub: @AhmedK506
