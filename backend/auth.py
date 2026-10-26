"""
Auth utilities: password hashing (bcrypt) and session tokens (JWT).

This is the REAL version of what the frontend mocked earlier. Passwords are
hashed with bcrypt before storage and never kept in plaintext. Login issues a
signed JWT the frontend sends on later requests.
"""

import re
import datetime
import bcrypt
import jwt
from functools import wraps
from flask import request, jsonify

from config import JWT_SECRET, JWT_EXPIRES_HOURS

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email or ""))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def make_token(user) -> str:
    payload = {
        "sub": user.id,
        "email": user.email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRES_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def require_auth(fn):
    """Route decorator: rejects requests without a valid Bearer token.
    Injects the user id as `user_id` keyword into the wrapped function."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        payload = decode_token(header.split(" ", 1)[1])
        if not payload:
            return jsonify({"error": "Session expired. Sign in again."}), 401
        kwargs["user_id"] = payload["sub"]
        return fn(*args, **kwargs)
    return wrapper
