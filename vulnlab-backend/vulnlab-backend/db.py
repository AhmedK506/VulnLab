"""
Database layer: SQLAlchemy models + session factory.

Tables:
  users            — accounts (password stored as a bcrypt hash, never plaintext)
  scans            — one row per completed scan
  vulnerabilities  — findings belonging to a scan
  schedules        — recurring scan definitions

Stage 1 uses users only. The scan/vulnerability/schedule tables are defined
now so the schema is complete and Stage 2 can start writing to them without
a migration.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker


def utcnow():
    """Naive UTC current time.

    We store naive-UTC datetimes so PostgreSQL does not convert them to the
    server's local timezone (which would shift them by the local offset). All
    reads go through to_epoch_ms(), which treats naive datetimes as UTC."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_epoch_ms(dt):
    """Convert a datetime to epoch milliseconds, treating naive datetimes as UTC.
    This is the single source of truth so the frontend always gets correct UTC
    timestamps it can convert to the user's local timezone."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)

from config import DATABASE_URL

# SQLite needs a special flag for multithreaded use; PostgreSQL does not.
engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    scans = relationship("Scan", back_populates="user", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email}


class Scan(Base):
    __tablename__ = "scans"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    url = Column(String(500), nullable=False)
    mode = Column(String(20), nullable=False)          # Quick / Deep / Targeted
    report_email = Column(String(255))
    status = Column(String(20), default="completed")   # queued / running / completed / failed
    ai_summary = Column(Text)                           # AI plain-English overall summary
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="scans")
    vulnerabilities = relationship(
        "Vulnerability", back_populates="scan", cascade="all, delete-orphan"
    )

    def to_dict(self):
        vulns = [v.to_dict() for v in self.vulnerabilities]
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        for v in vulns:
            counts[v["severity"]] = counts.get(v["severity"], 0) + 1
        return {
            "id": self.id,
            "url": self.url,
            "mode": self.mode,
            "email": self.report_email,
            "status": self.status,
            "aiSummary": self.ai_summary,
            "date": to_epoch_ms(self.created_at),
            "vulns": vulns,
            "counts": counts,
        }


class Vulnerability(Base):
    __tablename__ = "vulnerabilities"
    id = Column(Integer, primary_key=True)
    scan_id = Column(Integer, ForeignKey("scans.id"), nullable=False)
    name = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False)      # critical / high / medium / low / info
    score = Column(Float, default=0.0)                 # your risk-aware score
    location = Column(String(500))
    description = Column(Text)
    ai_what = Column(Text)                             # AI: what this is
    ai_why = Column(Text)                              # AI: why it matters
    ai_fix = Column(Text)                              # AI: what to do

    scan = relationship("Scan", back_populates="vulnerabilities")

    def to_dict(self):
        return {
            "name": self.name,
            "severity": self.severity,
            "score": self.score,
            "location": self.location,
            "desc": self.description,
            "ai": {
                "what": self.ai_what,
                "why": self.ai_why,
                "fix": self.ai_fix,
            } if self.ai_what else None,
        }


class Schedule(Base):
    __tablename__ = "schedules"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    url = Column(String(500), nullable=False)
    mode = Column(String(20), nullable=False)
    # repeat: Once / Daily / Weekly / Monthly / Custom
    repeat = Column(String(20), nullable=False, default="Weekly")
    # for Custom repeat: run every N days
    interval_days = Column(Integer, default=7)
    next_run = Column(DateTime)                         # exact next run time (UTC)
    status = Column(String(20), default="pending")     # pending / running / done
    progress = Column(Integer, default=0)              # live scan progress 0-100 while running
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="schedules")

    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "mode": self.mode,
            "repeat": self.repeat,
            "intervalDays": self.interval_days,
            "next": to_epoch_ms(self.next_run),
            "status": self.status,
            "progress": self.progress or 0,
        }


class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    report_email = Column(String(255), default="")
    email_notifications = Column(Boolean, default=True)
    weekly_digest = Column(Boolean, default=False)
    timezone = Column(String(64), default="Asia/Kuala_Lumpur")

    def to_dict(self):
        return {
            "reportEmail": self.report_email or "",
            "emailNotifications": bool(self.email_notifications),
            "weeklyDigest": bool(self.weekly_digest),
            "timezone": self.timezone or "Asia/Kuala_Lumpur",
        }


def init_db():
    """Create all tables if they do not exist."""
    Base.metadata.create_all(engine)