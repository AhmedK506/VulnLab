"""
ZAP client — drives OWASP ZAP through its Python API.

Flow for one scan:
    1. access the target (so ZAP knows about it)
    2. spider it (crawl) unless the mode disables crawling
    3. run the active scan (the actual attacks)
    4. read back the alerts (findings)

If ZAP is not reachable, we fall back to DEMO MODE which returns a realistic
sample result. This lets the rest of the app (routes, scoring, storage, UI)
be developed and demoed even before ZAP is installed. Real scanning switches
on automatically once ZAP is running at ZAP_API_URL.
"""

import time

from config import ZAP_API_URL, ZAP_API_KEY
from scanner.scan_modes import get_mode

# Try to import the ZAP library; if unavailable we stay in demo mode.
try:
    from zapv2 import ZAPv2
    _HAVE_ZAP_LIB = True
except Exception:
    _HAVE_ZAP_LIB = False


def _demo_alerts(url):
    """Realistic sample findings used when ZAP isn't available."""
    return [
        {"name": "SQL Injection", "risk": "High", "url": url + "/login", "param": "username",
         "description": "User input is placed into a SQL query without parameterisation, "
                        "allowing authentication bypass and data extraction."},
        {"name": "Cross Site Scripting (Reflected)", "risk": "High", "url": url + "/search?q=", "param": "q",
         "description": "Unescaped input is reflected into the response, allowing script injection."},
        {"name": "Content Security Policy (CSP) Header Not Set", "risk": "Medium", "url": url, "param": "",
         "description": "No CSP header is present, weakening defence against XSS and injection."},
        {"name": "Application Error Disclosure", "risk": "Medium", "url": url + "/api/user", "param": "",
         "description": "Server returns detailed errors that reveal internal paths and versions."},
        {"name": "Strict-Transport-Security Header Not Set", "risk": "Low", "url": url, "param": "",
         "description": "HSTS is not set, permitting a downgrade to unencrypted HTTP."},
    ]


def is_zap_available():
    """Quick check: is the ZAP library present AND the daemon reachable?"""
    if not _HAVE_ZAP_LIB:
        return False
    try:
        zap = _client()
        _ = zap.core.version
        return True
    except Exception:
        return False


def _client():
    return ZAPv2(
        apikey=ZAP_API_KEY or None,
        proxies={"http": ZAP_API_URL, "https": ZAP_API_URL},
    )


def run_scan(url, mode_name, progress_cb=None):
    """
    Run a full scan and return a list of raw alert dicts:
       {name, risk, url, param, description}
    progress_cb(percent, phase) is called as the scan advances.
    """
    mode = get_mode(mode_name)

    def report(pct, phase):
        if progress_cb:
            progress_cb(pct, phase)

    # ---- DEMO MODE ----
    if not is_zap_available():
        report(10, "starting (demo)")
        time.sleep(1)
        report(50, "scanning (demo)")
        time.sleep(1)
        report(100, "done (demo)")
        return _demo_alerts(url)

    # ---- REAL ZAP ----
    zap = _client()
    report(5, "accessing target")
    zap.urlopen(url)
    time.sleep(2)

    if mode["use_spider"]:
        report(15, "spidering")
        scan_id = zap.spider.scan(url, maxchildren=None)
        while int(zap.spider.status(scan_id)) < 100:
            time.sleep(2)
        # AJAX spider for JS-heavy sites (Deep mode)
        if mode["use_ajax"]:
            report(35, "ajax spidering")
            zap.ajaxSpider.scan(url)
            while zap.ajaxSpider.status == "running":
                time.sleep(2)

    if mode["active_scan"]:
        report(50, "active scan")
        ascan_id = zap.ascan.scan(url)
        while int(zap.ascan.status(ascan_id)) < 100:
            pct = 50 + int(zap.ascan.status(ascan_id)) * 0.45
            report(int(pct), "active scan")
            time.sleep(3)

    report(98, "collecting alerts")
    raw = zap.core.alerts(baseurl=url)
    alerts = []
    for a in raw:
        alerts.append({
            "name": a.get("alert", "Unknown"),
            "risk": a.get("risk", "Informational"),
            "url": a.get("url", url),
            "param": a.get("param", ""),
            "description": a.get("description", ""),
        })
    report(100, "done")
    return alerts
