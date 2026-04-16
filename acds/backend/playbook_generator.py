import time
import google.generativeai as genai
import config

genai.configure(api_key=config.GEMINI_API_KEY)
_model = genai.GenerativeModel('gemini-2.0-flash')
_last_gemini_call: float = 0.0
# Track how many calls we've made this minute to prevent rate limit exhaustion
_calls_this_session: int = 0
MAX_SESSION_CALLS = 50  # hard cap per session for free tier safety

def generate_playbook(alert: dict, attack_path: list) -> str:
    """
    Generate an AI playbook ONLY for Critical severity alerts.
    Enforces a minimum gap (GEMINI_RATE_LIMIT_SEC) between calls.
    If rate limit would be exceeded, returns a rule-based fallback immediately (no sleep).
    """
    global _last_gemini_call, _calls_this_session

    # Guard 1: Only Critical alerts get Gemini
    if alert.get('severity') != 'Critical':
        return _rule_based_playbook(alert, attack_path)

    # Guard 2: Session cap for free tier
    if _calls_this_session >= MAX_SESSION_CALLS:
        return _rule_based_playbook(alert, attack_path, reason="Session API cap reached (free tier)")

    # Guard 3: Rate limit — skip (don't sleep) if cooldown not met
    elapsed = time.time() - _last_gemini_call
    if elapsed < config.GEMINI_RATE_LIMIT_SEC:
        return _rule_based_playbook(alert, attack_path, reason=f"Rate limited ({int(config.GEMINI_RATE_LIMIT_SEC - elapsed)}s cooldown)")

    _last_gemini_call = time.time()
    _calls_this_session += 1

    path_str = ' → '.join(f"{s['id']} ({s['name']})" for s in attack_path) or 'Unknown'
    geo = alert.get('metadata', {}).get('geolocation') or 'Unknown location'
    source_file = alert.get('source_file', 'live simulation')

    prompt = f"""You are a senior SOC analyst. Generate an incident response playbook for this alert.

INCIDENT DATA:
- Alert Type: {alert.get('type')}
- Severity: {alert.get('severity')}
- Source IP: {alert.get('src_ip')} ({geo})
- Why Flagged: {alert.get('why_flagged')}
- Predicted Attack Path: {path_str}
- Correlated Multi-Vector: {alert.get('correlated', False)}
- Source Log File: {source_file}

RESPOND WITH EXACTLY THESE FOUR SECTIONS, no markdown, no preamble:

1. SUMMARY
[2 sentences specific to this IP, attack type, and geolocation]

2. NEXT MOVES
[What the attacker will do next based on the predicted path above. 2-3 sentences.]

3. IMMEDIATE ACTIONS
a) [action 1]
b) [action 2]
c) [action 3]
d) [action 4]

4. IOCs TO BLOCK
[List IPs, domains, hashes, or patterns to block immediately]

Be specific. Reference the actual IP address, attack type, and predicted next TTPs. Do NOT write generic advice."""

    try:
        response = _model.generate_content(prompt)
        return response.text
    except Exception as exc:
        return _rule_based_playbook(alert, attack_path, reason=f"Gemini error: {exc}")


def _rule_based_playbook(alert: dict, attack_path: list, reason: str = "") -> str:
    """Deterministic fallback playbook — no API required."""
    path_str = ' → '.join(f"{s['id']} ({s['name']})" for s in attack_path) if attack_path else 'Not predicted'
    src = alert.get('src_ip', 'unknown')
    why = alert.get('why_flagged', '')
    return (
        f"1. SUMMARY\n{why}. Immediate containment recommended for {src}.\n\n"
        f"2. NEXT MOVES\nBased on predicted path: {path_str}. Attacker may escalate to lateral movement.\n\n"
        f"3. IMMEDIATE ACTIONS\n"
        f"a) Block {src} at perimeter firewall\n"
        f"b) Isolate affected endpoints from network segment\n"
        f"c) Rotate all credentials exposed to this source IP\n"
        f"d) Notify SOC lead and escalate to incident response team\n\n"
        f"4. IOCs TO BLOCK\n{src}"
    )
