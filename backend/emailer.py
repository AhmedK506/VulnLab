"""
Email reporting (Stage 3).

Formats a completed scan into a readable email and sends it via SMTP using
Python's built-in smtplib. Designed for Mailtrap during development (a safe
fake inbox) but works with any SMTP provider (Gmail, etc.) by changing the
.env values.

GRACEFUL FALLBACK: if SMTP is not configured (no SMTP_HOST), sending is skipped
and the scan still completes normally. Nothing breaks if email isn't set up.

Stage 4 note: the AI plain-English summary will slot into build_report_html()
where indicated, once the AI layer is added.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM

SEV_COLORS = {
    "critical": "#FF3B5C",
    "high": "#FF8C42",
    "medium": "#FFD23F",
    "low": "#4ADE80",
    "info": "#00D9FF",
}


def is_email_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def build_report_html(scan_dict) -> str:
    """Build a simple, readable HTML report from a scan dict (from Scan.to_dict())."""
    url = scan_dict["url"]
    mode = scan_dict["mode"]
    counts = scan_dict["counts"]
    vulns = sorted(
        scan_dict["vulns"],
        key=lambda v: {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}.get(v["severity"], 5),
    )

    # AI plain-English summary if present, else rule-based fallback.
    summary = scan_dict.get("aiSummary") or _plain_summary(counts, vulns)

    rows = ""
    for v in vulns:
        color = SEV_COLORS.get(v["severity"], "#888")
        ai = v.get("ai")
        if ai:
            ai_block = f"""
            <div style="margin-top:6px;font-size:12.5px;color:#333;">
              <div><strong>What this means:</strong> {ai.get('what','')}</div>
              <div style="margin-top:3px;"><strong>Why it matters:</strong> {ai.get('why','')}</div>
              <div style="margin-top:3px;"><strong>What to do:</strong> {ai.get('fix','')}</div>
            </div>"""
        else:
            ai_block = f'<span style="color:#444;font-size:13px;">{v["desc"]}</span>'
        rows += f"""
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top;">
            <span style="background:{color};color:#111;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600;">
              {v['score']}
            </span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;">
            <strong>{v['name']}</strong><br>
            <span style="color:#666;font-size:12px;">{v['location']}</span>
            {ai_block}
          </td>
        </tr>"""

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#222;">
      <div style="background:#0A0E14;padding:20px;border-radius:10px 10px 0 0;">
        <h2 style="color:#00D9FF;margin:0;">VulnLab scan report</h2>
        <p style="color:#8B97A7;margin:4px 0 0;font-size:13px;">{url} &middot; {mode} scan</p>
      </div>
      <div style="border:1px solid #eee;border-top:none;padding:20px;border-radius:0 0 10px 10px;">
        <p style="font-size:14px;line-height:1.6;">{summary}</p>
        <div style="margin:16px 0;">
          <strong>Critical:</strong> {counts['critical']} &nbsp;
          <strong>High:</strong> {counts['high']} &nbsp;
          <strong>Medium:</strong> {counts['medium']} &nbsp;
          <strong>Low:</strong> {counts['low']}
        </div>
        <table style="width:100%;border-collapse:collapse;">
          {rows if rows else '<tr><td style="padding:8px;color:#666;">No vulnerabilities were found.</td></tr>'}
        </table>
        <p style="color:#999;font-size:12px;margin-top:20px;">
          This report was generated automatically by VulnLab.
        </p>
      </div>
    </div>"""


def _plain_summary(counts, vulns):
    """A simple rule-based summary (placeholder until Stage 4's AI version)."""
    total = sum(counts.values())
    if total == 0:
        return "Good news — this scan did not find any vulnerabilities on the target."
    parts = []
    if counts["critical"]:
        parts.append(f"{counts['critical']} critical issue(s) that need urgent attention")
    if counts["high"]:
        parts.append(f"{counts['high']} high-risk issue(s)")
    if counts["medium"]:
        parts.append(f"{counts['medium']} medium issue(s)")
    if counts["low"]:
        parts.append(f"{counts['low']} low issue(s)")
    lead = "This scan found " + ", ".join(parts) + "."
    top = vulns[0] if vulns else None
    if top and top["severity"] in ("critical", "high"):
        lead += f" The most serious is “{top['name']}” at {top['location']} — this should be reviewed first."
    return lead


def send_scan_report(to_email, scan_dict) -> bool:
    """Send the report. Returns True if sent, False if skipped/failed."""
    if not is_email_configured():
        print("[emailer] SMTP not configured — skipping email.")
        return False
    if not to_email:
        print("[emailer] No recipient email — skipping.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"VulnLab report — {scan_dict['url']} ({scan_dict['mode']})"
    msg["From"] = SMTP_FROM or SMTP_USER
    msg["To"] = to_email
    msg.attach(MIMEText(build_report_html(scan_dict), "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(msg["From"], [to_email], msg.as_string())
        print(f"[emailer] Report sent to {to_email}")
        return True
    except Exception as e:
        print(f"[emailer] Failed to send email: {e}")
        return False
