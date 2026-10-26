"""
Risk-aware scoring — VulnLab's original contribution.

The IR's core argument (Allodi 2015; CVSS limitations, Balsam et al. 2025) is
that a raw severity label does NOT equal real operational risk. ZAP gives us a
coarse risk label (High/Medium/Low/Informational) per finding. This module
converts that into a 0–10 risk-aware score by combining:

    base severity        what ZAP thinks the impact is
    exploitability       is it remotely reachable / does tooling exist?
    exposure             is it on an auth/entry point (login, search, api)?

This is deliberately transparent and rule-based so it can be explained and
defended in the report. It can later be extended with real exploit-DB lookups
or the machine-learning approaches the IR reviews.
"""

# ZAP risk string -> our base score and normalized severity band
BASE = {
    "High": (8.0, "high"),
    "Medium": (5.0, "medium"),
    "Low": (2.5, "low"),
    "Informational": (1.0, "info"),
}

# Vulnerability families that are heavily exploited in the wild get a bump.
# (Reflects the IR's point that a small subset of vulns drives most attacks.)
HIGH_EXPLOIT_KEYWORDS = [
    "sql injection", "sqli",
    "cross site scripting", "xss",
    "remote code", "command injection",
    "path traversal", "file inclusion",
]

# Endpoints that increase exposure if a finding sits on them.
SENSITIVE_PATH_HINTS = ["login", "signin", "auth", "admin", "search", "api", "upload", "password"]


def _clamp(x, lo=0.0, hi=10.0):
    return max(lo, min(hi, x))


def score_finding(zap_risk: str, name: str, url: str):
    """Return (score_float, severity_band) for one finding."""
    base, band = BASE.get(zap_risk, (1.0, "info"))
    name_l = (name or "").lower()
    url_l = (url or "").lower()

    exploit_bump = 0.0
    if any(k in name_l for k in HIGH_EXPLOIT_KEYWORDS):
        exploit_bump = 1.5  # known heavily-exploited class

    exposure_bump = 0.0
    if any(h in url_l for h in SENSITIVE_PATH_HINTS):
        exposure_bump = 0.8  # sits on a sensitive entry point

    score = _clamp(base + exploit_bump + exposure_bump)

    # Let the risk-aware score promote a band upward when it crosses thresholds,
    # so prioritization reflects real risk, not just ZAP's static label.
    if score >= 9.0:
        band = "critical"
    elif score >= 7.0 and band in ("medium", "low", "info"):
        band = "high"
    elif score >= 4.0 and band in ("low", "info"):
        band = "medium"

    return round(score, 1), band
