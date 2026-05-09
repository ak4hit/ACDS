<div align="center">

# ⚔️ ACDS — AI Cyber Defense System


[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Gemini](https://img.shields.io/badge/Gemini-AI_Playbooks-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![MITRE ATT&CK](https://img.shields.io/badge/MITRE-ATT%26CK_Mapped-E5311A?style=for-the-badge)](https://attack.mitre.org)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--Time-FF6B35?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

---

> **The problem:** Security teams drown in thousands of raw network and application logs every hour. By the time a human analyst spots a brute-force chain, a C2 beacon, or a data exfiltration attempt — the attacker has already moved laterally.
>
> **ACDS detects it in real-time, maps it to MITRE ATT&CK, and generates an AI-powered response playbook. Automatically.**

</div>

---

## 🎬 What It Does

ACDS is a **high-fidelity AI-driven Cyber Defense dashboard** that:

1. **Ingests** network and application logs in real-time — via live simulation, file upload, or Filebeat HTTP output
2. **Normalizes** all logs through a unified schema pipeline, abstracting away format differences between network and application layers
3. **Detects** threats using a 4-rule engine: Brute Force, C2 Beacon, Data Exfiltration, and Correlated Multi-Vector Incidents — all mapped to MITRE ATT&CK
4. **Streams** alerts instantly to the dashboard over WebSocket — zero polling, zero lag
5. **Generates** AI-powered incident response playbooks via Google Gemini for Critical-severity alerts — on demand, in the browser

---

## ⚡ Quick Start

```bash
# 1. Clone
git clone https://github.com/ak4hit/ACDS.git
cd ACDS

# 2. Backend
cd acds/backend
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # macOS/Linux
pip install -r ../requirements.txt

# (Optional) Configure Gemini AI Playbooks
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY

python -m uvicorn main:app --host 127.0.0.1 --port 8000

# 3. Frontend (new terminal)
cd acds/frontend_existing
npm install
npm run dev

# 4. Open the dashboard
# http://localhost:5173
```

---

## 🧠 The Detection Engine — 4 Rules, Real-Time

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         ACDS DETECTION PIPELINE                                  │
├─────────────────┬────────────────┬──────────────────────┬────────────────────────┤
│    INGESTION    │  NORMALIZATION │      DETECTION       │     RESPONSE           │
│                 │                │                      │                        │
│ • Live Simulate │ normalize()    │ Rule 1: BruteForce   │ • WebSocket broadcast  │
│ • File Upload   │                │  401/403 + auth_fail │ • MITRE ATT&CK map     │
│ • Filebeat HTTP │ → event_type   │  → T1110             │ • False-positive check │
│ • WARP Replay   │ → layer        │                      │   (admin whitelist)    │
│   (5 000 events)│ → bytes        │ Rule 2: C2Beacon     │ • Alert severity score │
│                 │ → status_code  │  network + bytes > 0 │ • On-demand Gemini     │
│                 │ → src_ip       │  → T1071             │   playbook (Critical)  │
│                 │ → dst_ip       │                      │                        │
│                 │                │ Rule 3: Exfiltration │                        │
│                 │ Supports:      │  bytes > 1 MB        │                        │
│                 │ • NDJSON       │  → T1041             │                        │
│                 │ • JSON array   │                      │                        │
│                 │ • Single JSON  │ Rule 4: Correlated   │                        │
│                 │ • Python dicts │  dns_query/http req  │                        │
│                 │                │  → T1078             │                        │
└─────────────────┴────────────────┴──────────────────────┴────────────────────────┘
                                          ↕
                        PostgreSQL-free — all state in-memory
                     alert_store · connected_clients · geo_cache
```

---

## 🗺️ Dashboard Pages

| Page | Route | Purpose |
|---|---|---|
| **Blueprints** | `/blueprints` | Live alert feed, WARP replay mode, file upload, monitor toggle |
| **Threats** | `/threats` | Threat matrix, severity breakdown, system health indicators |
| **Intelligence** | `/intelligence` | MITRE ATT&CK coverage heatmap, IOC tracker, propagation vectors |
| **Archives** | `/archives` | Paginated alert history, playbook viewer, log file browser |
| **Settings** | `/settings` | Detection thresholds, admin whitelist, Gemini config |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **AI / LLM** | Google Gemini AI | On-demand incident response playbook generation |
| **Backend** | FastAPI 0.115 + Uvicorn | Async REST API + WebSocket alert streaming |
| **Detection** | Custom Python Engine | 4-rule threat detection with MITRE ATT&CK mapping |
| **Normalization** | Custom Normalizer | Unified schema for network + application logs |
| **Frontend** | React 18 + Vite 5 | 5-page SPA with real-time WebSocket integration |
| **UI** | Tailwind CSS | Dark-mode dashboard with glass components |
| **Real-time** | WebSocket (native) | Zero-lag alert push to all connected clients |
| **Geo Lookup** | ip-api.com proxy | Threat map IP geolocation with server-side caching |
| **Log Simulation** | Python Generator | 100 synthetic `.log` files for demo mode |

---

## 📁 Project Structure

```
ACDS/
├── acds/
│   ├── backend/
│   │   ├── main.py                  # FastAPI app — all routes & WebSocket
│   │   ├── detection_engine.py      # 4-rule threat detector, MITRE mapping
│   │   ├── normalizer.py            # Network + application log normalization
│   │   ├── log_monitor.py           # Sequential log file scanner (monitor mode)
│   │   ├── log_generator.py         # Synthetic log file generator (100 files)
│   │   ├── simulation_engine.py     # Attack path simulation for playbooks
│   │   ├── playbook_generator.py    # Gemini AI playbook generation
│   │   ├── config.py                # All thresholds, whitelist, env vars
│   │   ├── generate_warp_manifest.py# 5 000-event WARP replay builder
│   │   ├── utils.py                 # Shared utility helpers
│   │   └── .env.example             # Environment variable template
│   ├── frontend_existing/           # ← Active React dashboard (run this)
│   │   └── src/
│   │       ├── App.jsx              # Router + layout shell
│   │       ├── context/
│   │       │   └── SocketContext.jsx# Global WebSocket provider
│   │       ├── components/
│   │       │   ├── Sidebar.jsx      # Navigation sidebar
│   │       │   └── Topbar.jsx       # Top status bar
│   │       └── pages/
│   │           ├── Blueprints.jsx   # Live feed, upload, monitor control
│   │           ├── Threats.jsx      # Threat matrix & system health
│   │           ├── Intelligence.jsx # MITRE coverage & IOC tracker
│   │           ├── Archives.jsx     # Alert history & log browser
│   │           └── Settings.jsx     # Detection config & whitelist
│   ├── frontend/                    # Scaffold (not used in production)
│   └── requirements.txt             # Python dependencies
├── stitch_screens/                  # UI design assets & mockups
├── vercel.json                      # Vercel deployment config
├── CHANGELOG.md                     # Full version history
├── SECURITY.md                      # Security policy & disclosure
└── README.md                        # This file
```

---

## 🔐 Environment Variables

```env
# Copy .env.example to .env inside acds/backend/

# Google Gemini API — AI Playbook generation (Critical alerts only)
# Get your key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
```

> All other parameters (thresholds, whitelist, input mode) are configurable live from the **Settings** page in the dashboard — no restart required.

---

## 🔑 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `WS` | `/ws/alerts` | Real-time alert stream (replays last 50 on connect) |
| `GET` | `/stats` | Dashboard summary stats |
| `GET` | `/alerts` | Paginated alert list |
| `POST` | `/upload` | Upload JSON/NDJSON log file for analysis |
| `POST` | `/ingest` | Filebeat HTTP output endpoint |
| `POST` | `/monitor/start` | Start sequential log file monitor |
| `POST` | `/monitor/stop` | Stop log file monitor |
| `POST` | `/warp` | Trigger 5 000-event WARP replay stream |
| `GET` | `/threats` | Filtered threat list |
| `GET` | `/intelligence/mitre` | MITRE ATT&CK coverage matrix |
| `GET` | `/intelligence/iocs` | Top 20 active IOCs |
| `GET` | `/geo/{ip}` | Server-side IP geolocation proxy |
| `POST` | `/playbooks/generate/{id}` | Generate Gemini AI playbook (Critical only) |
| `GET` | `/settings` | Read current detection config |
| `POST` | `/settings` | Update thresholds live |
| `POST` | `/reset` | Full system reset |

---

## 🧪 Input Modes

ACDS supports three log ingestion modes, switchable from the Settings page:

| Mode | How | Use Case |
|---|---|---|
| **Simulate** | Auto-generates synthetic logs from 100 `.log` files | Demo / development |
| **File Upload** | Drag-and-drop JSON/NDJSON log files in Blueprints | Offline analysis |
| **Filebeat** | Point Filebeat HTTP output to `POST /ingest` | Live production pipeline |

### WARP Mode
Click **WARP** in the Blueprints page to replay 5 000 pre-generated attack events at 500 events/second — demonstrating the system's throughput and WebSocket broadcast performance under load.

---

## 🛡️ MITRE ATT&CK Coverage

| Tactic | Technique | ID | Trigger |
|---|---|---|---|
| Credential Access | Brute Force | T1110 | 401/403 floods, failed_login events |
| Command & Control | Application Layer Protocol | T1071 | Periodic beacon-like network traffic |
| Exfiltration | Exfiltration Over C2 Channel | T1041 | Outbound transfers > 1 MB |
| Defense Evasion | Valid Accounts (Multi-Vector) | T1078 | Cross-layer correlated incidents |

---

## 🔄 Reset

Click **Reset System** in the Settings page or call `POST /reset` to wipe all in-memory alerts, reset the detection engine state, and restart the log monitor from file 0 — no service restart required.

---

<div align="center">



*ACDS — From Raw Log to Threat Intelligence in Real-Time*

</div>
