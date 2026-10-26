"""
Central configuration for VulnLab backend.

Everything the app needs (database, auth secret, CORS, and later ZAP + SMTP)
is read from environment variables here, so there is ONE place to change
settings. Values come from the .env file (see .env.example).
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ---- Database ----
# If DATABASE_URL is not set, fall back to a local SQLite file so the app
# still runs before PostgreSQL is configured. Switching to PostgreSQL is
# just setting DATABASE_URL in .env — no code change needed.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///vulnlab.db")

# ---- Auth ----
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_EXPIRES_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "24"))

# ---- Server ----
PORT = int(os.getenv("PORT", "5000"))
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")

# ---- ZAP (Stage 2) ----
ZAP_API_URL = os.getenv("ZAP_API_URL", "http://localhost:8080")
ZAP_API_KEY = os.getenv("ZAP_API_KEY", "")

# ---- Email (Stage 3) ----
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")

# ---- AI explanations (Stage 4) ----
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
