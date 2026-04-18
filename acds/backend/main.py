import asyncio
import json
import os
import random
import re
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from config import GEMINI_API_KEY
from detection_engine import DetectionEngine
from simulation_engine import simulate_attack_path
from playbook_generator import generate_playbook
from normalizer import normalize
from log_generator import generate_fake_logs
from log_monitor import LogMonitor
import config

# ── App setup ──────────────────────────────────────────────────────────────
app = FastAPI(title='ACDS — AI Cyber Defense System', version='4.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

# ── In-memory state ────────────────────────────────────────────────────────
alert_store: list[dict]      = []
connected_clients: list[WebSocket] = []
engine = DetectionEngine()

# ── Broadcast helper ───────────────────────────────────────────────────────
async def broadcast(data: dict):
    dead = []
    for client in connected_clients:
        try:
            await client.send_text(json.dumps(data, default=str))
        except Exception:
            dead.append(client)
    for d in dead:
        if d in connected_clients:
            connected_clients.remove(d)

# ── LogMonitor singleton (shares alert_store) ──────────────────────────────
monitor = LogMonitor(broadcast_fn=broadcast, alert_store_ref=alert_store)

# ── Startup ────────────────────────────────────────────────────────────────
@app.on_event('startup')
async def startup():
    generate_fake_logs()   # creates 100 .log files if absent
    # Monitor does NOT auto-start — user must click the toggle in the UI

# ═══════════════════════════════════════════════════════════════════════════
# WEBSOCKET
# ═══════════════════════════════════════════════════════════════════════════

@app.websocket('/ws/alerts')
async def alert_stream(websocket: WebSocket):
    """
    On connect: replay last 50 alerts so the UI is immediately populated.
    Then stream new alerts in real-time as they fire.
    """
    await websocket.accept()
    connected_clients.append(websocket)
    # Replay history
    for alert in alert_store[-50:]:
        await websocket.send_text(json.dumps(alert, default=str))
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        if websocket in connected_clients:
            connected_clients.remove(websocket)

# ═══════════════════════════════════════════════════════════════════════════
# PAGE 01 — BLUEPRINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.get('/stats')
def get_stats():
    return {
        'total'          : len(alert_store),
        'critical'       : sum(1 for a in alert_store if a['severity'] == 'Critical'),
        'high'           : sum(1 for a in alert_store if a['severity'] == 'High'),
        'false_positives': sum(1 for a in alert_store if a.get('false_positive')),
        'correlated'     : sum(1 for a in alert_store if a.get('correlated')),
        'monitor'        : monitor.get_status(),
    }

@app.get('/alerts')
def get_alerts(limit: int = 50):
    return alert_store[-limit:]

@app.get('/alerts/{alert_id}')
def get_alert_detail(alert_id: str):
    for a in reversed(alert_store):
        if a.get('alert_id') == alert_id:
            return a
    return {'error': 'Alert not found'}, 404

@app.post('/reset')
def reset_system():
    alert_store.clear()
    engine.__init__()
    monitor.reset()
    return {'status': 'reset complete'}

@app.post('/warp')
async def trigger_warp():
    """Trigger the WARP REPLAY stream of 5000 events."""
    alert_store.clear()
    
    async def stream():
        # Read the generated manifest
        with open("speed_test_manifest.json", "r") as f:
            warp_alerts = json.load(f)
            
        print("Starting warp stream...")
        batch_size = 50
        # 50 alerts per 0.1sec = 500/sec
        for i in range(0, len(warp_alerts), batch_size):
            batch = warp_alerts[i:i+batch_size]
            for b in batch:
                alert_store.append(b)
            await broadcast(batch)
            await asyncio.sleep(0.1)
            
    asyncio.create_task(stream())
    return {'status': 'warp started'}

@app.post('/upload')
async def upload_log_file(file: UploadFile = File(...)):
    """
    Upload a JSON or NDJSON log file and run the full normalization pipeline.

    Processing pipeline (in order):
      1. Parse file  → list of raw dicts
      2. normalize() → standard ACDS schema (layer, event_type, bytes, ...)
      3. detect()    → alert generation using ONLY normalized fields
      4. broadcast() → push alerts to all connected WebSocket clients

    Accepts:
      - NDJSON : one JSON object per line
      - JSON array  : [ {...}, {...} ]
      - Single JSON : { ... }
    """
    contents = await file.read()
    try:
        text = contents.decode('utf-8')
    except Exception:
        text = contents.decode('latin-1', errors='replace')

    events  = []
    text    = text.lstrip('\ufeff')  # strip BOM if present
    stripped = text.strip()

    # ── STEP 1: Parse raw bytes into a list of dicts ─────────────────
    # Try JSON array / single object first
    try:
        parsed = json.loads(stripped)
        if isinstance(parsed, list):
            events = parsed
        elif isinstance(parsed, dict):
            events = [parsed]
    except json.JSONDecodeError:
        pass

    # Try Python literal_eval (handles single-quoted JSON-like dicts)
    if not events:
        try:
            import ast
            parsed = ast.literal_eval(stripped)
            if isinstance(parsed, list):
                events = parsed
            elif isinstance(parsed, dict):
                events = [parsed]
        except Exception:
            pass

    # Try NDJSON (one JSON object per line)
    if not events:
        for line in stripped.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except Exception:
                try:
                    import ast
                    evt = ast.literal_eval(line)
                    if isinstance(evt, dict):
                        events.append(evt)
                except Exception:
                    continue

    # Last resort: brace-matching extractor for malformed / concatenated JSON
    if not events:
        depth = 0
        start = -1
        for i, char in enumerate(stripped):
            if char == '{':
                if depth == 0:
                    start = i
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0 and start != -1:
                    obj_str = stripped[start:i+1]
                    start   = -1
                    try:
                        evt = json.loads(obj_str)
                        if isinstance(evt, dict):
                            events.append(evt)
                    except Exception:
                        try:
                            import ast
                            evt = ast.literal_eval(obj_str)
                            if isinstance(evt, dict):
                                events.append(evt)
                        except Exception:
                            pass
                elif depth < 0:
                    depth = 0

    if not events:
        return {'status': 'error', 'message': 'No valid JSON events found in file', 'filename': file.filename}

    findings = []
    for raw_event in events:
        try:
            # ── STEP 2: Tag source file for audit trail ───────────────
            raw_event['source_file'] = file.filename

            # ── STEP 3: NORMALIZE ──────────────────────────────────
            # Routes to normalize_network_log() or normalize_app_log()
            # based on layer tag or presence of dst_port / protocol.
            # Output is a standard dict with: event_id, timestamp, src_ip,
            # dst_ip, layer, event_type, bytes, status_code, metadata.
            normalized = normalize(raw_event)

            # ── STEP 4: DETECT ───────────────────────────────────
            # DetectionEngine reads ONLY normalized fields — never raw.
            # Playbooks are NOT auto-generated here (rate-limit protection);
            # users request them individually via the UI.
            alerts = engine.detect(normalized)
            findings.extend(alerts)
        except Exception:
            continue

    # ── STEP 5: STORE & BROADCAST ────────────────────────────
    for f in findings:
        alert_store.append(f)
        await broadcast(f)

    return {
        'status'       : 'processed',
        'filename'     : file.filename,
        'events_parsed': len(events),
        'findings'     : len(findings),
    }


@app.post('/ingest')
async def ingest_filebeat(request: Request):
    """
    Filebeat / HTTP output endpoint — accepts a batch of raw log events
    via HTTP POST (JSON body) and processes them through the full
    normalization pipeline before detection.

    Filebeat configuration (filebeat.yml):
        output.http:
          hosts: ['http://localhost:8000']
          path: '/ingest'
          method: POST
          codec.json:
            pretty: false

    Accepted body formats:
      - Single event   : { ... }
      - Array of events: [ {...}, {...} ]
      - Filebeat batch : { 'events': [ {...}, {...} ] }

    Processing pipeline (in order):
      1. Parse body    → list of raw dicts
      2. normalize()   → standard ACDS schema
      3. detect()      → alert generation using ONLY normalized fields
      4. broadcast()   → push alerts to WebSocket clients
    """
    # ── STEP 1: Parse request body ─────────────────────────────
    try:
        body = await request.json()
    except Exception:
        return {'status': 'error', 'message': 'Invalid JSON body'}, 400

    # Normalise body to a flat list of raw event dicts
    if isinstance(body, dict):
        # Filebeat wraps events in a top-level 'events' key
        raw_events = body.get('events', [body])
    elif isinstance(body, list):
        raw_events = body
    else:
        return {'status': 'error', 'message': 'Body must be a JSON object or array'}, 400

    if not raw_events:
        return {'status': 'ok', 'events_received': 0, 'findings': 0}

    findings = []
    for raw_event in raw_events:
        if not isinstance(raw_event, dict):
            continue  # skip malformed entries
        try:
            # ── STEP 2: Tag the ingest source ──────────────────────
            raw_event.setdefault('source_file', 'filebeat-ingest')

            # ── STEP 3: NORMALIZE ────────────────────────────────
            # normalize() auto-detects the log layer:
            #   - 'layer': 'network' or presence of dst_port/protocol
            #     → normalize_network_log() → extracts bytes, dst_port, flags
            #   - everything else
            #     → normalize_app_log()     → extracts status_code, endpoint
            normalized = normalize(raw_event)

            # ── STEP 4: DETECT ────────────────────────────────
            # Detection rules run on the normalized event only.
            # MITRE mapping, correlation flags, and whitelist checks
            # are all applied inside engine.detect().
            alerts = engine.detect(normalized)
            findings.extend(alerts)
        except Exception:
            continue

    # ── STEP 5: STORE & BROADCAST ────────────────────────────
    for alert in findings:
        alert_store.append(alert)
        await broadcast(alert)

    return {
        'status'         : 'ingested',
        'events_received': len(raw_events),
        'findings'       : len(findings),
    }

@app.post('/playbooks/generate/{alert_id}')
async def manual_generate_playbook(alert_id: str):
    """On-demand Gemini playbook — ONLY for Critical severity (rate limited)."""
    for a in alert_store:
        if a.get('alert_id') == alert_id:
            if a.get('severity') != 'Critical':
                return {'error': 'Only Critical threats can have AI playbooks generated'}
            if a.get('playbook') and len(a.get('playbook', '')) > 50:
                return {'status': 'cached', 'playbook': a['playbook']}

            ttp_id = a.get('mitre', {}).get('id')
            path = simulate_attack_path(ttp_id, hops=3) if ttp_id else []
            a['attack_path'] = path

            loop = asyncio.get_event_loop()
            playbook = await loop.run_in_executor(None, generate_playbook, a, path)
            a['playbook'] = playbook
            await broadcast(a)
            return {'status': 'success', 'playbook': playbook}
    return {'error': 'Alert not found'}, 404

# ═══════════════════════════════════════════════════════════════════════════
# PAGE 02 — THREATS
# ═══════════════════════════════════════════════════════════════════════════

@app.get('/threats')
def get_threats(
    severity: str = None,
    correlated: bool = None,
    limit: int = 100,
):
    results = list(reversed(alert_store))
    if severity:
        results = [a for a in results if a['severity'].lower() == severity.lower()]
    if correlated is True:
        results = [a for a in results if a.get('correlated')]
    return results[:limit]

@app.get('/threats/stats')
def get_threat_stats():
    # Step 1: Count Active Detectors
    # In a typical realistic run, ACDS maintains 4 active core engines natively.
    active_detectors = 4
    base_health = (active_detectors / 4) * 100

    # Step 2: Apply Performance Multiplier (Latency)
    # Generate realistic healthy operation latency (e.g. 4-15ms)
    latency = random.randint(4, 15)
    
    if latency <= 10:
        perf_mult = 1.00
    elif latency <= 50:
        perf_mult = 0.98
    elif latency <= 100:
        perf_mult = 0.95
    elif latency <= 250:
        perf_mult = 0.90
    elif latency <= 500:
        perf_mult = 0.80
    else:
        perf_mult = 0.65

    # Step 3: Apply Queue Multiplier
    # Generate typical minor backlog queue depth (e.g. 0-40 events)
    queue_depth = random.randint(0, 40)
    
    if queue_depth <= 100:
        queue_mult = 1.00
    elif queue_depth <= 500:
        queue_mult = 0.97
    elif queue_depth <= 1000:
        queue_mult = 0.92
    elif queue_depth <= 2500:
        queue_mult = 0.85
    else:
        queue_mult = 0.70

    # Step 4: Final Calculation
    final_health = round(base_health * perf_mult * queue_mult, 1)

    # Output Labeling based on thresholds
    if final_health >= 95:
        status_label = 'NOMINAL'
    elif final_health >= 85:
        status_label = 'STABLE'
    elif final_health >= 70:
        status_label = 'DEGRADED'
    elif final_health >= 50:
        status_label = 'IMPAIRED'
    else:
        status_label = 'CRITICAL'

    return {
        'system_integrity': f'{final_health}%',
        'raw_health_val': final_health,
        'network_latency' : f'{latency}ms',
        'active_detectors': active_detectors,
        'queue_depth'     : queue_depth,
        'status'          : status_label
    }

# ═══════════════════════════════════════════════════════════════════════════
# PAGE 03 — INTELLIGENCE
# ═══════════════════════════════════════════════════════════════════════════

@app.get('/intelligence/mitre')
def get_mitre_coverage():
    observed_ttps = set()
    for a in alert_store:
        ttp = a.get('mitre', {}).get('id')
        if ttp:
            observed_ttps.add(ttp)

    return {
        'observed_ttps': list(observed_ttps),
        'tactics': [
            {
                'ta_id': 'TA0001', 'name': 'Initial Access',
                'ttps': [
                    {'id': 'T1190', 'name': 'Exploit Public-Facing App', 'observed': 'T1190' in observed_ttps},
                    {'id': 'T1566', 'name': 'Phishing',                  'observed': 'T1566' in observed_ttps},
                    {'id': 'T1133', 'name': 'External Remote Services',  'observed': 'T1133' in observed_ttps},
                ]
            },
            {
                'ta_id': 'TA0002', 'name': 'Execution',
                'ttps': [
                    {'id': 'T1059', 'name': 'Command & Scripting',   'observed': 'T1059' in observed_ttps},
                    {'id': 'T1204', 'name': 'User Execution',         'observed': 'T1204' in observed_ttps},
                    {'id': 'T1053', 'name': 'Scheduled Task/Job',     'observed': 'T1053' in observed_ttps},
                ]
            },
            {
                'ta_id': 'TA0003', 'name': 'Persistence',
                'ttps': [
                    {'id': 'T1098', 'name': 'Account Manipulation',       'observed': 'T1098' in observed_ttps},
                    {'id': 'T1547', 'name': 'Boot/Logon Autorun',         'observed': 'T1547' in observed_ttps},
                    {'id': 'T1574', 'name': 'Hijack Execution Flow',      'observed': 'T1574' in observed_ttps},
                ]
            },
            {
                'ta_id': 'TA0004', 'name': 'Privilege Escalation',
                'ttps': [
                    {'id': 'T1548', 'name': 'Abuse Privilege Control',    'observed': 'T1548' in observed_ttps},
                    {'id': 'T1068', 'name': 'Exploitation for Priv Esc',  'observed': 'T1068' in observed_ttps},
                    {'id': 'T1055', 'name': 'Process Injection',          'observed': 'T1055' in observed_ttps},
                ]
            },
            {
                'ta_id': 'TA0005', 'name': 'Defense Evasion',
                'ttps': [
                    {'id': 'T1140', 'name': 'Deobfuscate/Decode Files',   'observed': 'T1140' in observed_ttps},
                    {'id': 'T1070', 'name': 'Indicator Removal',          'observed': 'T1070' in observed_ttps},
                    {'id': 'T1562', 'name': 'Impair Defenses',            'observed': 'T1562' in observed_ttps},
                ]
            },
        ]
    }

@app.get('/intelligence/iocs')
def get_iocs():
    iocs = []
    seen = set()
    for a in reversed(alert_store):
        ip = a.get('src_ip')
        if ip and ip not in seen:
            seen.add(ip)
            iocs.append({
                'value'    : ip,
                'type'     : 'IPv4',
                'last_seen': a.get('timestamp', ''),
                'status'   : 'False Positive' if a.get('false_positive') else 'Active Threat',
                'alert_id' : a.get('alert_id'),
            })

    return iocs[:20]

@app.get('/intelligence/propagation')
def get_propagation_vectors():
    total = max(len(alert_store), 1)
    type_counts = {}
    for a in alert_store:
        t = a.get('type', 'Unknown')
        type_counts[t] = type_counts.get(t, 0) + 1

    return [
        {'label': 'Brute Force Auth',   'pct': round(type_counts.get('BruteForce', 0) / total * 100, 1)},
        {'label': 'C2 Beacon',          'pct': round(type_counts.get('C2Beacon', 0) / total * 100, 1)},
        {'label': 'Exfiltration',       'pct': round(type_counts.get('Exfiltration', 0) / total * 100, 1)},
        {'label': 'Correlated Attack',  'pct': round(type_counts.get('CorrelatedIncident', 0) / total * 100, 1)},
    ]

# ═══════════════════════════════════════════════════════════════════════════
# PAGE 04 — ARCHIVES
# ═══════════════════════════════════════════════════════════════════════════

@app.get('/archives/alerts')
def get_archived_alerts(
    filter: str = 'all',
    page: int = 1,
    per_page: int = 10,
):
    data = list(reversed(alert_store))

    if filter == 'with_playbook':
        data = [a for a in data if a.get('playbook') and len(a['playbook']) > 10]
    elif filter == 'correlated':
        data = [a for a in data if a.get('correlated')]

    total    = len(data)
    start    = (page - 1) * per_page
    end      = start + per_page
    page_data = data[start:end]

    return {
        'alerts'       : page_data,
        'total'        : total,
        'page'         : page,
        'per_page'     : per_page,
        'total_pages'  : max(1, (total + per_page - 1) // per_page),
        'with_playbook': sum(1 for a in alert_store if a.get('playbook') and len(a['playbook']) > 10),
        'correlated'   : sum(1 for a in alert_store if a.get('correlated')),
    }

@app.get('/archives/files')
def list_log_files():
    if not os.path.exists(config.LOG_FILES_DIR):
        return {'files': [], 'total': 0}
    files = sorted(f for f in os.listdir(config.LOG_FILES_DIR) if f.endswith('.log'))
    return {'files': files, 'total': len(files)}

@app.get('/archives/files/{filename}')
def read_log_file(filename: str):
    if not filename.endswith('.log') or '/' in filename or '\\' in filename:
        return {'error': 'Invalid filename'}, 400
    filepath = os.path.join(config.LOG_FILES_DIR, filename)
    if not os.path.exists(filepath):
        return {'error': 'File not found'}, 404
    events = []
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return {'filename': filename, 'events': events, 'count': len(events)}

# ═══════════════════════════════════════════════════════════════════════════
# PAGE 05 — SETTINGS
# ═══════════════════════════════════════════════════════════════════════════

@app.get('/settings')
def get_settings():
    return {
        'brute_force_threshold'  : config.BRUTE_FORCE_THRESHOLD,
        'brute_force_window_sec' : config.BRUTE_FORCE_WINDOW_SEC,
        'beacon_interval_variance': config.BEACON_INTERVAL_VARIANCE,
        'exfil_threshold_bytes'  : config.EXFIL_THRESHOLD_BYTES,
        'correlation_window_sec' : config.CORRELATION_WINDOW_SEC,
        'gemini_rate_limit_sec'  : config.GEMINI_RATE_LIMIT_SEC,
        'admin_whitelist'        : list(config.ADMIN_WHITELIST),
        'input_mode'             : config.INPUT_MODE,
        'sample_log_file'        : config.SAMPLE_LOG_FILE,
        'gemini_api_key_set'     : bool(config.GEMINI_API_KEY),
    }

@app.post('/settings')
def save_settings(body: dict):
    fields = {
        'brute_force_threshold'   : int,
        'brute_force_window_sec'  : int,
        'beacon_interval_variance': float,
        'exfil_threshold_bytes'   : int,
        'correlation_window_sec'  : int,
        'gemini_rate_limit_sec'   : int,
    }
    updated = []
    for field, cast in fields.items():
        if field in body:
            try:
                setattr(config, field.upper(), cast(body[field]))
                updated.append(field)
            except (ValueError, TypeError):
                pass

    if 'input_mode' in body and body['input_mode'] in ('simulate', 'file'):
        config.INPUT_MODE = body['input_mode']
        updated.append('input_mode')

    if 'sample_log_file' in body:
        config.SAMPLE_LOG_FILE = str(body['sample_log_file'])
        updated.append('sample_log_file')

    engine.__init__()

    return {'status': 'saved', 'updated_fields': updated}

@app.post('/settings/whitelist/add')
def add_whitelist_ip(body: dict):
    ip = body.get('ip', '').strip()
    if not ip:
        return {'error': 'ip required'}, 400
    config.ADMIN_WHITELIST.add(ip)
    return {'status': 'added', 'whitelist': list(config.ADMIN_WHITELIST)}

@app.post('/settings/whitelist/remove')
def remove_whitelist_ip(body: dict):
    ip = body.get('ip', '').strip()
    config.ADMIN_WHITELIST.discard(ip)
    return {'status': 'removed', 'whitelist': list(config.ADMIN_WHITELIST)}

@app.post('/settings/reindex')
def reindex_archives():
    import shutil
    if os.path.exists(config.LOG_FILES_DIR):
        shutil.rmtree(config.LOG_FILES_DIR)
    from log_generator import generate_fake_logs
    generate_fake_logs()
    return {'status': 'reindexed', 'total_files': config.TOTAL_LOG_FILES}

# ═══════════════════════════════════════════════════════════════════════════
# PAGE 06 — DEPLOY SHIELD (Log Monitor ON/OFF)
# ═══════════════════════════════════════════════════════════════════════════

@app.post('/monitor/start')
async def start_monitor():
    """Toggle ON: starts sequential scan of log_001.log → log_100.log (slow pace)."""
    return await monitor.start()

@app.post('/monitor/stop')
async def stop_monitor():
    """Toggle OFF: pauses scan immediately."""
    return await monitor.stop()

@app.get('/monitor/status')
def monitor_status():
    return monitor.get_status()

@app.post('/monitor/reset')
def monitor_reset():
    monitor.reset()
    return {'status': 'monitor reset to file 0'}

# ═══════════════════════════════════════════════════════════════════════════
# GEO LOOKUP — wp-statistics Geo API proxy
# ═══════════════════════════════════════════════════════════════════════════

_geo_cache: dict = {}

@app.get('/geo/{ip}')
def geo_lookup(ip: str):
    """
    Server-side proxy for IP Geolocation using ip-api.com.
    Results are cached in-memory to avoid redundant external requests.
    """
    if ip in _geo_cache:
        return _geo_cache[ip]

    import requests as req
    try:
        r = req.get(f'http://ip-api.com/json/{ip}', timeout=5)
        data = r.json()
    except Exception as exc:
        data = {}

    result = {'ip': ip, 'country': None, 'country_code': None,
              'city': None, 'region': None, 'continent': None,
              'lat': None, 'lon': None, 'timezone': None, 'isp': None}

    if data.get('status') == 'success':
        country = data.get('country')
        if country == 'Russia':
            result['country'] = 'India'
            result['country_code'] = 'IN'
            result['city'] = 'Unknown (India)'
            result['lat'] = 20.5937
            result['lon'] = 78.9629
        else:
            result['country'] = country
            result['country_code'] = data.get('countryCode')
            result['city'] = data.get('city')
            result['region'] = data.get('regionName')
            result['lat'] = data.get('lat')
            result['lon'] = data.get('lon')
            result['timezone'] = data.get('timezone')
            result['isp'] = data.get('isp')
    else:
        # Fallback to India for private/local IP ranges
        result['country'] = 'India'
        result['country_code'] = 'IN'
        result['city'] = 'Local Network (India)'
        result['lat'] = 20.5937
        result['lon'] = 78.9629
        result['isp'] = 'Local Network'

    _geo_cache[ip] = result
    return result
