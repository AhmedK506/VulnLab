# VulnLab Backend — Stage 2 (Real scanning with OWASP ZAP)

Flask + SQLAlchemy + PostgreSQL, now with background scans powered by OWASP ZAP
and a risk-aware scoring layer.

## IMPORTANT — legal/ethical
Only scan sites you OWN or have explicit permission to test. Unauthorized
scanning is illegal (Malaysia: Computer Crimes Act 1997). For practice use
deliberately vulnerable targets:
  - http://testphp.vulnweb.com   (public, sanctioned)
  - OWASP Juice Shop (run locally)
  - DVWA (run locally)

## Demo mode (works WITHOUT ZAP)
If ZAP is not running, scans still work and return realistic SAMPLE findings,
so you can test the whole flow first. Real scanning turns on automatically once
ZAP is running. Check GET /api/health -> "zap_available": true/false.

## Setting up real ZAP scanning

### 1. Install Java (ZAP needs it)
Download the JDK from https://adoptium.net (Temurin 17+). Install, then verify:
```
java -version
```

### 2. Install OWASP ZAP
Download from https://www.zaproxy.org/download/ (Windows installer).

### 3. Run ZAP in daemon (headless) mode
Open a terminal in the ZAP install folder and run:
```
zap.bat -daemon -port 8080 -config api.disablekey=true
```
Leave it running. (api.disablekey=true is fine for local dev; set a real key
in production and put it in ZAP_API_KEY in your .env.)

### 4. Install the ZAP Python library
It's already in requirements.txt (python-owasp-zap-v2.4). Just:
```
pip install -r requirements.txt
```

## Run the backend
```
venv\Scripts\activate
python app.py
```

## Scan routes
- POST /api/scans               { url, mode, email } -> { job_id }   (starts background scan)
- GET  /api/scans/status/<job> -> { status, percent, phase, scan_id }
- GET  /api/scans              -> { scans: [...] }
- GET  /api/scans/<id>         -> { scan: {...} }

## How scans run
1. Frontend POSTs to /api/scans and gets a job_id.
2. A background thread drives ZAP: access -> spider -> active scan -> alerts.
3. Each finding is scored by scanner/risk_scoring.py (the risk-aware layer).
4. Results are saved to the database; the frontend polls status and opens
   the scan detail page when complete.

## Scan modes (scanner/scan_modes.py)
  Quick    shallow crawl + light attack
  Deep     full crawl (+ AJAX) + full attack
  Targeted no crawl; deep attack on the exact URL

## Coming next
- Stage 3: email the report (SMTP) + scheduled scans (APScheduler)

## Stage 3 — Email reports + scheduled scans

### Email (Mailtrap)
1. Sign up free at https://mailtrap.io
2. Email Testing -> Inboxes -> your inbox -> SMTP Settings -> choose "SMTP"
3. Copy the 4 values into your .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
4. Restart the backend.
When a scan finishes, the report is emailed to the address entered for that scan
(and appears in your Mailtrap inbox). If SMTP is blank, scans still work — email
is just skipped.

### Scheduled scans
The backend runs APScheduler, which checks every minute for due schedules and
runs them automatically (same pipeline as manual scans). To demo:
1. Create a schedule (Scheduled page -> Schedule a scan).
2. Its next run is set by frequency; to see it fire quickly you can shorten the
   interval in code (scanner/scheduler.py) or set next_run in the past via the DB.
As long as the backend is running, due scans fire on their own — this is the
"continuous monitoring" capability. For true 24/7 the backend is deployed to an
always-on server.

### New Stage 3 routes
- GET/POST /api/schedules, PATCH/DELETE /api/schedules/<id>
- GET/PATCH /api/settings
