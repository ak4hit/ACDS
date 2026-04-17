import uuid
from collections import defaultdict
from datetime import datetime, timedelta
import config

MITRE_MAP = {
    'brute_force' : {'id': 'T1110',  'name': 'Brute Force',                         'tactic': 'Credential Access'},
    'c2_beacon'   : {'id': 'T1071',  'name': 'Application Layer Protocol',           'tactic': 'Command and Control'},
    'exfiltration': {'id': 'T1041',  'name': 'Exfiltration Over C2 Channel',         'tactic': 'Exfiltration'},
    'correlated'  : {'id': 'T1078',  'name': 'Valid Accounts (Multi-Vector Attack)', 'tactic': 'Defense Evasion'},
}

class DetectionEngine:
    def __init__(self):
        # {src_ip: [timestamp, ...]}  — sliding window for brute force
        self._bf_windows: dict = defaultdict(list)
        # {src_ip: [timestamp, ...]}  — for beacon interval detection
        self._beacon_times: dict = defaultdict(list)
        # {src_ip: int}  — cumulative bytes per IP
        self._exfil_bytes: dict = defaultdict(int)
        # {src_ip: {'layer': str, 'ts': datetime}}  — cross-layer tracking
        self._layer_hits: dict = {}

    def detect(self, event: dict) -> list[dict]:
        """
        Analyse a NORMALIZED event and return a list of alerts.

        IMPORTANT: This method expects events that have already passed through
        normalizer.normalize(). All field reads use the standard normalized
        schema — no raw-field fallbacks (bytes_sent, payload_size, etc.).

        Normalized fields consumed:
            event_type  — semantic label set by normalizer
            layer       — 'network' | 'application'
            bytes       — canonical data volume (int)
            status_code — HTTP status code at top level (int | None)
            src_ip      — source IP
            dst_ip      — destination IP
            metadata    — dict of layer-specific originals (display only)
        """
        alerts     = []
        src        = event.get('src_ip', '')

        # ── Read only normalized top-level fields ─────────────────────
        event_type  = event.get('event_type', '')
        layer       = event.get('layer', '')

        # 'bytes' is the canonical field set by normalizer (not bytes_sent / payload_size)
        try:
            bytes_count = int(event.get('bytes') or 0)
        except (ValueError, TypeError):
            bytes_count = 0

        # 'status_code' is promoted to top-level by normalize_app_log()
        # For network logs this is None; never read from metadata here.
        status_code = event.get('status_code')

        alert_severity = 'High'
        alert_type     = 'Unknown'
        mitre_key      = ''
        why            = ''

        # ── Rule 1: Brute-Force / Auth Failure ────────────────────────
        # Triggered by: auth_attempt / failed_login event types,
        # OR any application-layer event with a 401/403 status code.
        if event_type in ('failed_login', 'auth_attempt') or (
            layer == 'application' and status_code in (401, 403)
        ):
            alert_type     = 'BruteForce'
            mitre_key      = 'brute_force'
            why            = f"Failed login attempt from {src}"
            alert_severity = 'Critical'

        # ── Rule 2: Exfiltration / C2 Beacon ─────────────────────────
        # Triggered by: outbound_transfer event_type OR any network event
        # with a non-zero byte count (beaconing pattern).
        elif event_type == 'outbound_transfer' or (
            layer == 'network' and bytes_count > 0
        ):
            if bytes_count > 1_000_000:
                alert_type     = 'Exfiltration'
                mitre_key      = 'exfiltration'
                mb             = bytes_count // 1_000_000
                dst            = event.get('dst_ip', 'unknown')
                why            = f"Large outbound transfer: {mb}MB to {dst}"
                alert_severity = 'Critical'
            else:
                alert_type     = 'C2Beacon'
                mitre_key      = 'c2_beacon'
                why            = f"Beacon-like traffic detected from {src}"
                alert_severity = 'High'

        # ── Rule 3: Suspicious Query / Cross-Layer Signal ─────────────
        # Triggered by DNS/HTTP event types that often precede lateral movement.
        elif event_type in ('dns_query', 'http_request'):
            alert_type     = 'CorrelatedIncident'
            mitre_key      = 'correlated'
            why            = "Suspicious network query or cross-layer event."
            alert_severity = 'Critical'

        # ── Rule 4: Catch-all — anomalous / unclassified ──────────────
        else:
            alert_type     = 'CorrelatedIncident'
            mitre_key      = 'correlated'
            why            = f"Anomalous traffic pattern detected from {src}"
            alert_severity = 'Critical'

        # ── Build alert and apply cross-layer / whitelist checks ──────
        alert = self._make_alert(src, event, alert_severity, alert_type, mitre_key, why)

        if alert_type == 'CorrelatedIncident':
            alert['correlated'] = True

        alert = self._check_false_positive(alert, event)
        alerts.append(alert)

        return alerts

    def _make_alert(self, src_ip, event, severity, alert_type, mitre_key, why) -> dict:
        return {
            'alert_id'    : f"XQ-{uuid.uuid4().hex[:4].upper()}",
            'timestamp'   : datetime.utcnow().isoformat(),
            'src_ip'      : src_ip,
            'dst_ip'      : event.get('dst_ip'),
            'severity'    : severity,
            'type'        : alert_type,
            'mitre'       : MITRE_MAP.get(mitre_key, {}),
            'why_flagged' : why,
            'false_positive': False,
            'correlated'  : False,
            'layer'       : event.get('layer'),
            'metadata'    : event.get('metadata', {}),
            'attack_path' : [],
            'playbook'    : '',
            'source_file' : event.get('source_file', ''),
        }

    def _check_false_positive(self, alert: dict, event: dict) -> dict:
        src = alert.get('src_ip', '')
        if src in config.ADMIN_WHITELIST:
            alert['false_positive'] = True
            dst = alert.get('dst_ip') or event.get('dst_ip', 'unknown')
            alert['why_flagged'] = f"Source is whitelisted admin host ({src}), destination is {dst}"
            alert['severity'] = 'Low'
        return alert
