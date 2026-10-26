"""
VulnLab backend — Stage 1 (database + authentication).

Run:
    python app.py

Routes live here for now. As Stages 2–3 are added, scanning/schedule/email
routes will be added below the auth routes.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

from config import PORT, CORS_ORIGIN
from db import SessionLocal, User, Scan, Schedule, Setting, init_db
from auth import (
    valid_email, hash_password, check_password,
    make_token, require_auth,
)
from scanner.runner import start_scan_job, get_job
from scanner.zap_client import is_zap_available
from ai_explainer import is_ai_configured
from scheduler import start_scheduler
from datetime import datetime, timedelta, timezone

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": CORS_ORIGIN}})

# Create tables on startup.
init_db()


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "vulnlab-backend",
        "stage": 4,
        "zap_available": is_zap_available(),
        "ai_available": is_ai_configured(),
    })


# ---------------- Scans ----------------

@app.post("/api/scans")
@require_auth
def create_scan(user_id):
    """Start a scan in the background. Returns a job_id to poll."""
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()
    mode = (data.get("mode") or "Quick").strip()
    report_email = (data.get("email") or "").strip()

    if not url.startswith("http://") and not url.startswith("https://"):
        return jsonify({"error": "Enter a valid URL starting with http:// or https://"}), 400
    if mode not in ("Quick", "Deep", "Targeted"):
        return jsonify({"error": "Invalid scan mode."}), 400

    job_id = start_scan_job(user_id, url, mode, report_email)
    return jsonify({"job_id": job_id}), 202


@app.get("/api/scans/status/<job_id>")
@require_auth
def scan_status(user_id, job_id):
    """Poll a running scan. When done, includes scan_id of the saved scan."""
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Unknown job."}), 404
    return jsonify(job)


@app.get("/api/scans")
@require_auth
def list_scans(user_id):
    db = SessionLocal()
    try:
        scans = (db.query(Scan)
                 .filter(Scan.user_id == user_id)
                 .order_by(Scan.created_at.desc())
                 .all())
        return jsonify({"scans": [s.to_dict() for s in scans]})
    finally:
        db.close()


@app.get("/api/scans/<int:scan_id>")
@require_auth
def get_scan(user_id, scan_id):
    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == user_id).first()
        if not scan:
            return jsonify({"error": "Scan not found."}), 404
        return jsonify({"scan": scan.to_dict()})
    finally:
        db.close()


@app.post("/api/auth/signup")
def signup():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name:
        return jsonify({"error": "Enter your name."}), 400
    if not valid_email(email):
        return jsonify({"error": "Enter a valid email address."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            return jsonify({"error": "An account with this email already exists."}), 409
        user = User(name=name, email=email, password_hash=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
        return jsonify({"token": make_token(user), "user": user.to_dict()}), 201
    finally:
        db.close()


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not valid_email(email):
        return jsonify({"error": "Enter a valid email address."}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not check_password(password, user.password_hash):
            return jsonify({"error": "Incorrect email or password."}), 401
        return jsonify({"token": make_token(user), "user": user.to_dict()})
    finally:
        db.close()


@app.get("/api/auth/me")
@require_auth
def me(user_id):
    db = SessionLocal()
    try:
        user = db.query(User).get(user_id)
        if not user:
            return jsonify({"error": "Account not found."}), 404
        return jsonify({"user": user.to_dict()})
    finally:
        db.close()


@app.patch("/api/auth/account")
@require_auth
def update_account(user_id):
    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        user = db.query(User).get(user_id)
        if not user:
            return jsonify({"error": "Account not found."}), 404

        new_email = (data.get("newEmail") or "").strip().lower()
        new_password = data.get("newPassword") or ""
        name = (data.get("name") or "").strip()

        if new_email:
            if not valid_email(new_email):
                return jsonify({"error": "Enter a valid email address."}), 400
            exists = db.query(User).filter(User.email == new_email, User.id != user.id).first()
            if exists:
                return jsonify({"error": "That email is already in use."}), 409
            user.email = new_email
        if new_password:
            if len(new_password) < 6:
                return jsonify({"error": "Password must be at least 6 characters."}), 400
            user.password_hash = hash_password(new_password)
        if name:
            user.name = name

        db.commit()
        db.refresh(user)
        return jsonify({"token": make_token(user), "user": user.to_dict()})
    finally:
        db.close()


REPEAT_OPTIONS = ("Once", "Daily", "Weekly", "Monthly", "Custom")
REPEAT_DAYS = {"Daily": 1, "Weekly": 7, "Monthly": 30}


def _parse_run_at(data):
    """Parse the client's chosen start time (epoch ms) into a NAIVE UTC datetime.

    The frontend sends the absolute moment as epoch milliseconds. We convert to
    UTC and then STRIP the tzinfo, storing a naive datetime that represents UTC.

    Why strip tzinfo: the DB column is a naive DateTime. If we hand SQLAlchemy a
    timezone-aware value, PostgreSQL converts it to the server's local timezone
    and drops the offset — which shifts the time by the local UTC offset (e.g.
    +8h on a Malaysia machine). Storing naive-UTC keeps the exact UTC wall clock,
    and db.to_epoch_ms() reads it back as UTC. This keeps the round-trip exact.
    """
    ms = data.get("runAt")
    if ms is None:
        return (datetime.now(timezone.utc) + timedelta(minutes=5)).replace(tzinfo=None)
    try:
        dt = datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc)
        return dt.replace(tzinfo=None)  # naive UTC
    except Exception:
        return (datetime.now(timezone.utc) + timedelta(minutes=5)).replace(tzinfo=None)


# ---------------- Schedules ----------------

@app.get("/api/schedules")
@require_auth
def list_schedules(user_id):
    db = SessionLocal()
    try:
        rows = (db.query(Schedule)
                .filter(Schedule.user_id == user_id)
                .order_by(Schedule.next_run.asc())
                .all())
        return jsonify({"schedules": [s.to_dict() for s in rows]})
    finally:
        db.close()


@app.post("/api/schedules")
@require_auth
def create_schedule(user_id):
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()
    mode = (data.get("mode") or "Deep").strip()
    repeat = (data.get("repeat") or "Weekly").strip()
    interval_days = int(data.get("intervalDays") or 7)

    if not url.startswith("http://") and not url.startswith("https://"):
        return jsonify({"error": "Enter a valid URL starting with http:// or https://"}), 400
    if mode not in ("Quick", "Deep", "Targeted"):
        return jsonify({"error": "Invalid scan mode."}), 400
    if repeat not in REPEAT_OPTIONS:
        return jsonify({"error": "Invalid repeat option."}), 400
    if repeat == "Custom" and interval_days < 1:
        return jsonify({"error": "Custom interval must be at least 1 day."}), 400

    db = SessionLocal()
    try:
        sched = Schedule(
            user_id=user_id, url=url, mode=mode,
            repeat=repeat, interval_days=interval_days,
            next_run=_parse_run_at(data),
            status="pending",
        )
        db.add(sched)
        db.commit()
        db.refresh(sched)
        return jsonify({"schedule": sched.to_dict()}), 201
    finally:
        db.close()


@app.patch("/api/schedules/<int:sid>")
@require_auth
def update_schedule_route(user_id, sid):
    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        sched = db.query(Schedule).filter(Schedule.id == sid, Schedule.user_id == user_id).first()
        if not sched:
            return jsonify({"error": "Schedule not found."}), 404
        if "url" in data:
            sched.url = data["url"].strip()
        if "mode" in data and data["mode"] in ("Quick", "Deep", "Targeted"):
            sched.mode = data["mode"]
        if "repeat" in data and data["repeat"] in REPEAT_OPTIONS:
            sched.repeat = data["repeat"]
        if "intervalDays" in data:
            sched.interval_days = max(1, int(data["intervalDays"] or 7))
        if "runAt" in data:
            sched.next_run = _parse_run_at(data)
            sched.status = "pending"
        db.commit()
        db.refresh(sched)
        return jsonify({"schedule": sched.to_dict()})
    finally:
        db.close()


@app.delete("/api/schedules/<int:sid>")
@require_auth
def delete_schedule_route(user_id, sid):
    db = SessionLocal()
    try:
        sched = db.query(Schedule).filter(Schedule.id == sid, Schedule.user_id == user_id).first()
        if not sched:
            return jsonify({"error": "Schedule not found."}), 404
        db.delete(sched)
        db.commit()
        return jsonify({"ok": True})
    finally:
        db.close()


# ---------------- Settings ----------------

def _get_or_create_settings(db, user_id):
    s = db.query(Setting).filter(Setting.user_id == user_id).first()
    if not s:
        user = db.query(User).get(user_id)
        s = Setting(user_id=user_id, report_email=(user.email if user else ""))
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


@app.get("/api/settings")
@require_auth
def get_settings(user_id):
    db = SessionLocal()
    try:
        s = _get_or_create_settings(db, user_id)
        return jsonify({"settings": s.to_dict()})
    finally:
        db.close()


@app.patch("/api/settings")
@require_auth
def update_settings(user_id):
    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        s = _get_or_create_settings(db, user_id)
        if "reportEmail" in data:
            s.report_email = (data["reportEmail"] or "").strip()
        if "emailNotifications" in data:
            s.email_notifications = bool(data["emailNotifications"])
        if "weeklyDigest" in data:
            s.weekly_digest = bool(data["weeklyDigest"])
        if "timezone" in data and data["timezone"]:
            s.timezone = str(data["timezone"])[:64]
        db.commit()
        db.refresh(s)
        return jsonify({"settings": s.to_dict()})
    finally:
        db.close()


if __name__ == "__main__":
    start_scheduler()
    app.run(host="127.0.0.1", port=PORT, debug=True, use_reloader=False)
