# Changelog

All notable changes to the ACDS — AI Cyber Defense System are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.1.0] — 2026-05-09 · Hackathon Release

### Added
- **WARP Replay Mode** — streams 5 000 pre-generated attack events at 500 events/sec via `POST /warp` to demonstrate throughput and WebSocket broadcast performance under load
- **Server-side IP Geolocation proxy** — `GET /geo/{ip}` endpoint caches results in-memory to avoid redundant external calls to ip-api.com; all private/local IP ranges fall back to India
- **WARP manifest generator** (`generate_warp_manifest.py`) — builds the `speed_test_manifest.json` replay file offline
- **Admin whitelist false-positive suppression** — any alert from a whitelisted IP is automatically downgraded to `Low` severity with an explanatory `why_flagged` note
- **On-demand Gemini AI Playbooks** — `POST /playbooks/generate/{alert_id}` calls Google Gemini to produce a structured incident response playbook for Critical-severity alerts; rate-limited to prevent API abuse
- **Full MITRE ATT&CK mapping** in alert schema: `T1110`, `T1071`, `T1041`, `T1078`
- **Cross-layer alert correlation** — `CorrelatedIncident` type set for DNS/HTTP events that may indicate lateral movement

### Changed
- Detection engine refactored to consume **only normalized fields** — never raw event keys — ensuring consistent behaviour across all input modes
- `normalize()` now handles NDJSON, JSON array, single-object JSON, Python dict literals, and brace-matched malformed JSON via a 4-pass parser cascade
- `POST /playbooks/generate/{alert_id}` restricted back to `Critical` severity only (rate-limit protection)
- `GET /threats/stats` now computes system health score dynamically from active detector count, simulated latency, and queue depth rather than returning a static value

### Fixed
- WebSocket broadcast correctly removes disconnected clients from `connected_clients` without raising exceptions
- `monitor.reset()` called on `POST /reset` to ensure log file pointer returns to position 0
- False-positive whitelist check applied in WARP batch mode as well as single-event ingestion

---

## [4.0.0] — 2026-05-07 · Multi-Page Dashboard

### Added
- 5-page React SPA: **Blueprints**, **Threats**, **Intelligence**, **Archives**, **Settings**
- Global WebSocket provider (`SocketContext`) — single connection shared across all pages
- **Intelligence page** — MITRE ATT&CK coverage heatmap, IOC tracker (top 20 source IPs), propagation vector chart
- **Archives page** — paginated alert history with playbook viewer and raw log file browser
- **Settings page** — live-editable detection thresholds, admin whitelist management, Gemini config status, re-index action
- `GET /archives/alerts` with `filter`, `page`, `per_page` query parameters
- `GET /archives/files` and `GET /archives/files/{filename}` for browsing generated log files

### Changed
- Frontend migrated from `frontend/` scaffold to `frontend_existing/` — full production implementation
- Sidebar navigation links to all 5 dashboard pages
- Topbar displays live connection status and system name

---

## [3.0.0] — 2026-05-06 · Filebeat Integration

### Added
- `POST /ingest` — Filebeat-compatible HTTP output endpoint accepting single events, arrays, and `{ "events": [...] }` batch format
- `local_filebeat.yml` — reference Filebeat configuration pointing to `POST /ingest`
- `LogMonitor` class — sequential scan of `log_001.log` → `log_100.log` with configurable pace; toggled via `POST /monitor/start` and `POST /monitor/stop`
- `GET /monitor/status` and `POST /monitor/reset` management endpoints
- `simulate_attack.ps1` — PowerShell script to send synthetic attack events during live demos

### Changed
- Backend `startup` event generates 100 synthetic `.log` files if absent; monitor does **not** auto-start (user-controlled via UI toggle)

---

## [2.0.0] — 2026-05-05 · Detection Engine & Normalization

### Added
- `DetectionEngine` with 4 rules: BruteForce, C2Beacon, Exfiltration, CorrelatedIncident
- `normalize()` dispatcher — routes to `normalize_network_log()` or `normalize_app_log()` based on `layer` tag or presence of `dst_port`/`protocol`
- `POST /upload` — full normalization → detection → broadcast pipeline for uploaded log files; supports NDJSON, JSON array, single object, Python dict literals, and brace-matched extraction
- `playbook_generator.py` — wraps Google Gemini for structured playbook generation
- `simulation_engine.py` — generates plausible multi-hop attack paths for playbook context
- Alert schema: `alert_id`, `timestamp`, `src_ip`, `dst_ip`, `severity`, `type`, `mitre`, `why_flagged`, `false_positive`, `correlated`, `layer`, `metadata`, `attack_path`, `playbook`, `source_file`

### Changed
- All detection rules operate exclusively on normalized fields; raw-field fallbacks removed

---

## [1.0.0] — 2026-05-04 · Initial Release

### Added
- FastAPI application with CORS middleware
- In-memory `alert_store` and `connected_clients` list
- `GET /stats`, `GET /alerts`, `GET /alerts/{alert_id}`, `POST /reset`
- WebSocket endpoint `/ws/alerts` — replays last 50 alerts on connect, then streams new alerts live
- `generate_fake_logs.py` — creates synthetic NDJSON log files for demo mode
- `config.py` — all thresholds and environment variable loading via `python-dotenv`
- `.env.example` with `GEMINI_API_KEY` placeholder
