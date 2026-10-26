"""
AI explanation layer (Stage 4) — Google Gemini.

Turns already-scored findings into plain-English explanations for non-experts.

ARCHITECTURE (important, and defensible in the report):
  - The risk-scoring engine RANKS findings (severity + score). Unchanged.
  - The AI only EXPLAINS those findings in simple language. It never decides
    severity or invents scores. AI is a translator, not a judge.

GRACEFUL FALLBACK: if GEMINI_API_KEY is missing or the API call fails, we return
rule-based fallback text so reports still work and the app never breaks.

Free API key: https://aistudio.google.com/app/apikey  (no credit card for the
free tier). Put it in .env as GEMINI_API_KEY.
"""

import json
import urllib.request
import urllib.error

from config import GEMINI_API_KEY, GEMINI_MODEL

API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={key}"
)


def is_ai_configured() -> bool:
    return bool(GEMINI_API_KEY)


def _fallback_summary(counts):
    total = sum(counts.values())
    if total == 0:
        return "Good news — this scan did not find any vulnerabilities on the target."
    parts = []
    for level in ("critical", "high", "medium", "low"):
        if counts.get(level):
            parts.append(f"{counts[level]} {level}")
    return ("This scan found " + ", ".join(parts) +
            " issue(s). Review the critical and high items first.")


def _fallback_explanation(v):
    return {
        "what": v.get("desc", "A potential security weakness was detected."),
        "why": "If left unfixed, this could be exploited by an attacker to harm the site or its users.",
        "fix": "Share this finding with a developer to review and remediate.",
    }


def _call_gemini(prompt: str):
    """Low-level call. Returns text or None on any failure."""
    if not GEMINI_API_KEY:
        return None
    url = API_URL.format(model=GEMINI_MODEL, key=GEMINI_API_KEY)
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 2048},
    }).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"[ai] Gemini call failed: {e}")
        return None


def generate_explanations(scan_dict):
    """
    Given a scan dict (url, counts, vulns[]), return:
      { "summary": str, "explanations": { vuln_index: {what, why, fix} } }
    Falls back to rule-based text if AI is unavailable.
    """
    counts = scan_dict["counts"]
    vulns = scan_dict["vulns"]

    # Build fallbacks first so we always have something.
    result = {
        "summary": _fallback_summary(counts),
        "explanations": {i: _fallback_explanation(v) for i, v in enumerate(vulns)},
    }

    if not is_ai_configured() or not vulns:
        return result

    # One prompt for everything (cheaper + fewer calls). Ask for strict JSON.
    findings_text = "\n".join(
        f'{i}. {v["name"]} (severity: {v["severity"]}, at {v["location"]})'
        for i, v in enumerate(vulns)
    )
    prompt = f"""You are helping a non-technical website owner understand a security scan.
The scan of {scan_dict['url']} found these issues (severity already decided by our system — do NOT change it):

{findings_text}

Return ONLY valid JSON (no markdown, no backticks) in exactly this shape:
{{
  "summary": "2-3 sentences in plain English summarizing the overall security state and what to prioritize",
  "explanations": [
    {{"index": 0, "what": "what this issue is, in simple terms", "why": "why it matters, real-world impact, no jargon", "fix": "one simple, practical next step"}}
  ]
}}
Rules: one explanation object per finding index. Keep each field to 1-2 short sentences. Avoid technical jargon. Do not invent new issues or change severities."""

    text = _call_gemini(prompt)
    if not text:
        return result  # fallback

    # Parse the JSON the model returned (strip any stray code fences).
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 2)[1] if "```" in cleaned else cleaned
        cleaned = cleaned.replace("json", "", 1).strip() if cleaned.lower().startswith("json") else cleaned
    try:
        parsed = json.loads(cleaned)
        if parsed.get("summary"):
            result["summary"] = parsed["summary"]
        for item in parsed.get("explanations", []):
            idx = item.get("index")
            if isinstance(idx, int) and 0 <= idx < len(vulns):
                result["explanations"][idx] = {
                    "what": item.get("what", result["explanations"][idx]["what"]),
                    "why": item.get("why", result["explanations"][idx]["why"]),
                    "fix": item.get("fix", result["explanations"][idx]["fix"]),
                }
    except Exception as e:
        print(f"[ai] Could not parse Gemini JSON, using fallback: {e}")

    return result
