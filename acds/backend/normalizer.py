"""
normalizer.py — ACDS Normalization Layer
=========================================
Every raw log event (from log_generator, Filebeat, or file upload) passes
through this module BEFORE it reaches the DetectionEngine.

Normalization contract
─────────────────────
All downstream components (DetectionEngine, correlator, MITRE mapper,
playbook generator) receive a dict with EXACTLY these top-level keys:

    event_id   : str   — unique ID generated here (EVT-XXXXXXXX)
    timestamp  : str   — ISO-8601 UTC string
    src_ip     : str   — source IP address
    dst_ip     : str   — destination IP (may be None for app logs)
    layer      : str   — "network" | "application"
    event_type : str   — semantic type (e.g. "auth_attempt", "outbound_transfer")
    bytes      : int   — data volume (normalised from bytes_sent / payload_size)
    status_code: int   — HTTP status code (None for network logs)
    metadata   : dict  — all layer-specific fields preserved here
    source_file: str   — originating log filename (propagated if present)
"""

import uuid
from datetime import datetime
import utils  # in-process geo-lookup (cached)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Network log normalizer
# Input fields: dst_port, protocol, bytes_sent, duration_ms, flags, layer, …
# ─────────────────────────────────────────────────────────────────────────────

def normalize_network_log(raw: dict) -> dict:
    """
    Normalize a raw network-layer event into the ACDS standard schema.

    Network logs typically originate from packet captures, firewall exports,
    or Filebeat with network modules. They contain fields like dst_port,
    protocol, bytes_sent, flags, duration_ms.

    Detection heuristics mapped:
      - Large bytes_sent  → Exfiltration candidate
      - Regular intervals → C2Beacon candidate
      - SYN/port 22       → Lateral movement
    """
    ip = raw.get('src_ip')

    # Geo-lookup is cached in utils.py — safe to call on every event
    geo = utils.get_geo(ip) if ip else None

    # Normalise byte count: Filebeat uses 'bytes_sent', some schemas use 'bytes'
    raw_bytes = raw.get('bytes_sent') or raw.get('bytes') or 0
    try:
        byte_count = int(raw_bytes)
    except (ValueError, TypeError):
        byte_count = 0

    # Infer a semantic event_type if the raw log didn't set one explicitly
    inferred_type = raw.get('event_type')
    if not inferred_type:
        if byte_count > 1_000_000:
            inferred_type = 'outbound_transfer'
        elif raw.get('flags', '') in ('SYN', 'SYN-ACK'):
            inferred_type = 'connection'
        else:
            inferred_type = 'network_packet'

    return {
        # ── Standard fields ──────────────────────────────────────────
        'event_id'   : f"EVT-{uuid.uuid4().hex[:8].upper()}",
        'timestamp'  : raw.get('timestamp', datetime.utcnow().isoformat()),
        'src_ip'     : ip,
        'dst_ip'     : raw.get('dst_ip'),
        'layer'      : 'network',           # always force correct layer tag
        'event_type' : inferred_type,
        'bytes'      : byte_count,          # canonical name used by DetectionEngine
        'status_code': None,                # not applicable for network layer

        # ── All original network-specific fields kept in metadata ───
        'metadata': {
            'dst_port'   : raw.get('dst_port'),
            'protocol'   : raw.get('protocol'),
            'flags'      : raw.get('flags'),
            'duration_ms': raw.get('duration_ms'),
            'geolocation': geo,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Application log normalizer
# Input fields: endpoint, status_code, method, payload_size, user_agent, …
# ─────────────────────────────────────────────────────────────────────────────

def normalize_app_log(raw: dict) -> dict:
    """
    Normalize a raw application-layer event into the ACDS standard schema.

    App logs come from web servers, auth services, or Filebeat with HTTP/
    system modules. They contain fields like endpoint, status_code, method,
    payload_size, user_agent.

    Detection heuristics mapped:
      - 401/403 on /login  → BruteForce candidate
      - Unusual user_agent → Suspicious API call
      - High payload_size  → Potential data exfiltration via HTTP
    """
    ip       = raw.get('src_ip')
    endpoint = raw.get('endpoint', '')
    geo      = utils.get_geo(ip) if ip else None

    # Normalise status_code to int (some sources send as string)
    raw_status = raw.get('status_code')
    try:
        status_code = int(raw_status) if raw_status is not None else None
    except (ValueError, TypeError):
        status_code = None

    # Normalise byte count: app logs use 'payload_size' or 'bytes'
    raw_bytes = raw.get('payload_size') or raw.get('bytes') or 0
    try:
        byte_count = int(raw_bytes)
    except (ValueError, TypeError):
        byte_count = 0

    # Infer semantic event_type from endpoint + status code
    inferred_type = raw.get('event_type')
    if not inferred_type:
        if '/login' in endpoint or '/auth' in endpoint:
            inferred_type = 'auth_attempt'
        elif status_code in (401, 403):
            inferred_type = 'failed_login'
        else:
            inferred_type = 'api_call'

    return {
        # ── Standard fields ──────────────────────────────────────────
        'event_id'   : f"EVT-{uuid.uuid4().hex[:8].upper()}",
        'timestamp'  : raw.get('timestamp', datetime.utcnow().isoformat()),
        'src_ip'     : ip,
        'dst_ip'     : raw.get('dst_ip'),   # often absent in app logs
        'layer'      : 'application',        # always force correct layer tag
        'event_type' : inferred_type,
        'bytes'      : byte_count,
        'status_code': status_code,          # top-level for easy DetectionEngine access

        # ── All original app-specific fields kept in metadata ───────
        'metadata': {
            'method'     : raw.get('method'),
            'endpoint'   : endpoint,
            'status_code': status_code,      # also duplicated here for frontend display
            'user_agent' : raw.get('user_agent'),
            'geolocation': geo,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Unified entry point
# Called by: log_monitor._scan_and_stream(), /upload endpoint, /ingest endpoint
# ─────────────────────────────────────────────────────────────────────────────

def normalize(raw: dict) -> dict:
    """
    Route a raw log event to the correct normalizer based on its layer tag
    or the presence of network-specific fields.

    Decision logic:
      1. If raw['layer'] == 'network'       → normalize_network_log()
      2. Else if 'dst_port' or 'protocol'
         present (Filebeat network module)  → normalize_network_log()
      3. Otherwise                          → normalize_app_log()

    After normalization, propagate any bookkeeping keys that were attached
    upstream (e.g. 'source_file' added by log_monitor / upload handler).
    """

    # ── Route to the correct sub-normalizer ──────────────────────────
    is_network = (
        raw.get('layer') == 'network'
        or 'dst_port' in raw
        or 'protocol' in raw
    )

    if is_network:
        normalized = normalize_network_log(raw)
    else:
        normalized = normalize_app_log(raw)

    # ── Propagate upstream bookkeeping keys ──────────────────────────
    # 'source_file' is set by log_monitor and upload handler so that
    # alert cards in the UI can show which log file triggered the alert.
    if 'source_file' in raw:
        normalized['source_file'] = raw['source_file']

    return normalized
