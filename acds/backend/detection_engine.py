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
        alerts = []
        src = event.get('src_ip', '')
        
        # User explicitly requested EVERY event to be flagged as an individual threat
        event_type = event.get('event_type')
        layer = event.get('layer')
        bytes_count = event.get('bytes') or event.get('bytes_sent') or 0
        try:
            bytes_count = int(bytes_count)
        except (ValueError, TypeError):
            bytes_count = 0
        
        alert_severity = 'High'
        alert_type = 'Unknown'
        mitre_key = ''
        why = ''

        if event_type in ['failed_login', 'auth_attempt'] or (layer == 'application' and event.get('status_code') in [401, 403]):
            alert_type = 'BruteForce'
            mitre_key = 'brute_force'
            why = f"Failed login attempt from {src}"
            alert_severity = 'Critical'  # Made Critical if desired, but user just said "AI analysis one analysis for one critical file is ok"
            
        elif event_type == 'outbound_transfer' or layer == 'network' and bytes_count > 0:
            if bytes_count > 1000000:
                alert_type = 'Exfiltration'
                mitre_key = 'exfiltration'
                mb = bytes_count // 1000000
                dst = event.get('dst_ip', 'unknown')
                why = f"Large outbound transfer: {mb}MB to {dst}"
                alert_severity = 'Critical'
            else:
                alert_type = 'C2Beacon'
                mitre_key = 'c2_beacon'
                why = f"Beacon-like traffic packet event detected from {src}"
                alert_severity = 'High'
                
        elif event_type in ['dns_query', 'http_request']:
            alert_type = 'CorrelatedIncident'
            mitre_key = 'correlated'
            why = f"Suspicious network query or cross-layer event."
            alert_severity = 'Critical'
            
        else:
            alert_type = 'CorrelatedIncident'
            mitre_key = 'correlated'
            why = f"Anomalous traffic pattern detected from {src}"
            alert_severity = 'Critical'

        alert = self._make_alert(
            src, event, alert_severity, alert_type, mitre_key, why
        )
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
