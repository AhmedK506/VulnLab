"""
Background scan runner.

Scans (especially Deep) take minutes, so we run them on a background thread
and let the frontend poll for status. A small in-memory registry tracks each
running job's progress. When a scan finishes, results are written to the
database and the job is marked complete.

This is intentionally lightweight (threads + a dict) — appropriate for a
single-server FYP prototype. For production you would use a task queue
(Celery/RQ) with a broker, but the API contract here would stay the same.
"""

import threading
import uuid

from db import SessionLocal, Scan, Vulnerability
from scanner.zap_client import run_scan
from scanner.risk_scoring import score_finding
from emailer import send_scan_report
from ai_explainer import generate_explanations

# job_id -> {status, percent, phase, scan_id, error}
_jobs = {}
_lock = threading.Lock()


def _set(job_id, **patch):
    with _lock:
        _jobs.setdefault(job_id, {})
        _jobs[job_id].update(patch)


def get_job(job_id):
    with _lock:
        return dict(_jobs.get(job_id, {})) or None


def start_scan_job(user_id, url, mode, report_email, on_complete=None, on_progress=None):
    """Kick off a background scan; return the job_id immediately.
    on_complete(success: bool) is called when the scan finishes.
    on_progress(percent: int) is called as the scan advances (used by the
    scheduler to store live progress on the schedule row)."""
    job_id = uuid.uuid4().hex
    _set(job_id, status="running", percent=0, phase="queued", scan_id=None, error=None)

    t = threading.Thread(
        target=_worker,
        args=(job_id, user_id, url, mode, report_email, on_complete, on_progress),
        daemon=True,
    )
    t.start()
    return job_id


def _worker(job_id, user_id, url, mode, report_email, on_complete=None, on_progress=None):
    def progress(pct, phase):
        _set(job_id, percent=pct, phase=phase)
        if on_progress:
            try:
                on_progress(pct)
            except Exception:
                pass

    success = False
    try:
        alerts = run_scan(url, mode, progress_cb=progress)

        db = SessionLocal()
        try:
            scan = Scan(user_id=user_id, url=url, mode=mode,
                        report_email=report_email, status="completed")
            db.add(scan)
            db.flush()  # get scan.id

            for a in alerts:
                score, band = score_finding(a["risk"], a["name"], a["url"])
                loc = a["url"] + (f"?{a['param']}" if a.get("param") else "")
                db.add(Vulnerability(
                    scan_id=scan.id,
                    name=a["name"],
                    severity=band,
                    score=score,
                    location=loc,
                    description=a["description"],
                ))
            db.commit()

            # --- Stage 4: AI plain-English explanations ---
            # Engine already ranked; AI only explains. Falls back gracefully.
            if progress_cb:
                progress_cb(99, "writing explanations")
            try:
                scan_for_ai = scan.to_dict()
                ai = generate_explanations(scan_for_ai)
                scan.ai_summary = ai["summary"]
                vulns_rows = scan.vulnerabilities
                for i, vrow in enumerate(vulns_rows):
                    exp = ai["explanations"].get(i)
                    if exp:
                        vrow.ai_what = exp["what"]
                        vrow.ai_why = exp["why"]
                        vrow.ai_fix = exp["fix"]
                db.commit()
            except Exception as e:
                print(f"[runner] AI explanation step failed (non-fatal): {e}")

            scan_dict = scan.to_dict()
            _set(job_id, status="completed", percent=100, phase="done", scan_id=scan.id)
            success = True
        finally:
            db.close()

        # Email the report (skips gracefully if SMTP not configured)
        if report_email:
            try:
                send_scan_report(report_email, scan_dict)
            except Exception as e:
                print(f"[runner] email step failed: {e}")

    except Exception as e:
        _set(job_id, status="failed", phase="error", error=str(e))
    finally:
        if on_complete:
            try:
                on_complete(success)
            except Exception as e:
                print(f"[runner] on_complete callback failed: {e}")
