"""
Scheduler (Stage 3, updated for flexible repeats).

Runs inside the Flask backend. Every minute it checks the schedules table for
any schedule whose next_run time has passed, then launches that scan using the
same background runner used by manual scans.

Repeat handling after a run:
  Once     -> mark done, do not reschedule
  Daily    -> next_run += 1 day
  Weekly   -> next_run += 7 days
  Monthly  -> next_run += 30 days
  Custom   -> next_run += interval_days

This is what makes VulnLab "continuous". As long as the backend is running,
due scans fire automatically. For true 24/7 the backend runs on an always-on
server.
"""

from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from db import SessionLocal, Schedule
from scanner.runner import start_scan_job

REPEAT_DAYS = {"Daily": 1, "Weekly": 7, "Monthly": 30}


def _make_on_progress(schedule_id):
    """Return a callback that stores live scan progress on the schedule row."""
    def _cb(percent):
        db = SessionLocal()
        try:
            sched = db.query(Schedule).get(schedule_id)
            if sched and sched.status == "running":
                sched.progress = int(percent)
                db.commit()
        except Exception:
            pass
        finally:
            db.close()
    return _cb


def _make_on_complete(schedule_id, repeat, interval_days, fired_at):
    """Return a callback that finalizes a schedule after its scan completes."""
    def _cb(success):
        db = SessionLocal()
        try:
            sched = db.query(Schedule).get(schedule_id)
            if not sched:
                return
            sched.progress = 100 if success else 0
            if repeat == "Once":
                sched.status = "done"
            else:
                if repeat == "Custom":
                    days = max(1, interval_days or 1)
                else:
                    days = REPEAT_DAYS.get(repeat, 7)
                now = datetime.now(timezone.utc).replace(tzinfo=None)
                base = fired_at
                while base <= now:
                    base = base + timedelta(days=days)
                sched.next_run = base
                sched.status = "pending"  # ready for its next run
                sched.progress = 0
            db.commit()
            print(f"[scheduler] Schedule {schedule_id} finalized (success={success}).")
        finally:
            db.close()
    return _cb


def _check_due_schedules():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)  # naive UTC to match stored values
        # only pick schedules that are waiting (not already running)
        rows = db.query(Schedule).filter(Schedule.status == "pending").all()
        to_fire = []
        for sched in rows:
            nr = sched.next_run
            if nr is None:
                continue
            if nr.tzinfo is not None:
                nr = nr.replace(tzinfo=None)
            if nr > now:
                continue
            to_fire.append((sched, nr))

        # mark them running first (so they aren't picked again next minute)
        for sched, nr in to_fire:
            sched.status = "running"
            sched.progress = 0
        if to_fire:
            db.commit()

        # then launch each with progress + completion callbacks
        for sched, nr in to_fire:
            print(f"[scheduler] Firing scheduled scan: {sched.url} ({sched.mode}, {sched.repeat})")
            cb = _make_on_complete(sched.id, sched.repeat, sched.interval_days, nr)
            prog = _make_on_progress(sched.id)
            start_scan_job(sched.user_id, sched.url, sched.mode, report_email="",
                           on_complete=cb, on_progress=prog)
    except Exception as e:
        print(f"[scheduler] error: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(_check_due_schedules, "interval", minutes=1, id="due_check")
    scheduler.start()
    print("[scheduler] started - checking every minute for due scans.")
    return scheduler
