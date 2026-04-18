import asyncio
import json
import os
from datetime import datetime
from detection_engine import DetectionEngine
from normalizer import normalize
from simulation_engine import simulate_attack_path
from playbook_generator import generate_playbook
import config

class LogMonitor:
    def __init__(self, broadcast_fn, alert_store_ref: list):
        self._broadcast     = broadcast_fn
        self._alert_store   = alert_store_ref  # shared reference to main alert_store
        self.is_running     = False
        self.current_file_index = 0      # index into sorted file list (0-based)
        self.total_findings = 0
        self._engine        = DetectionEngine()
        self._task          = None

    # ── Public API ─────────────────────────────────────────────────

    async def start(self) -> dict:
        if self.is_running:
            return {'status': 'already_running', 'at_file': self.current_file_index}
        # Implicitly reset if previously finished so users can replay without manual reset
        if self.current_file_index > 0:
            self.reset()
            self.is_running = True
            
        self.is_running = True
        self._task = asyncio.create_task(self._run_loop())
        return {'status': 'started', 'from_file': self.current_file_index + 1}

    async def stop(self) -> dict:
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        await self._broadcast({
            'type'   : 'log_scan_paused',
            'at_file': self.current_file_index,
            'message': f"Monitoring paused after log_{self.current_file_index:03d}.log",
        })
        return {'status': 'paused', 'at_file': self.current_file_index}

    def reset(self):
        self.is_running         = False
        self.current_file_index = 0
        self.total_findings     = 0
        self._engine            = DetectionEngine()

    def get_status(self) -> dict:
        total = config.TOTAL_LOG_FILES
        return {
            'is_running'   : self.is_running,
            'current_file' : self.current_file_index,
            'total_files'  : total,
            'total_findings': self.total_findings,
            'progress_pct' : round((self.current_file_index / total) * 100, 1),
        }

    # ── Internal loop ──────────────────────────────────────────────

    async def _run_loop(self):
        filepath = os.path.join(os.path.dirname(__file__), 'sample_logs.json')
        filename = 'sample_logs.json'

        if not os.path.exists(filepath):
            self.is_running = False
            return

        # Resume support: already processed once
        if self.current_file_index > 0:
            self.is_running = False
            return

        # Broadcast start so UI knows scanning began
        await self._broadcast({
            'type'        : 'log_scan_progress',
            'file'        : filename,
            'file_number' : 1,
            'total'       : config.TOTAL_LOG_FILES,
            'progress_pct': 0,
            'findings_count': 0,
            'status'      : 'scanning',
        })

        # Stream alerts in real-time as they are detected
        total_found = await self._scan_and_stream(filepath, filename)

        self.current_file_index = 1
        self.total_findings    += total_found

        # All done
        if self.is_running:
            self.is_running = False
            await self._broadcast({
                'type'          : 'log_scan_complete',
                'total_files'   : config.TOTAL_LOG_FILES,
                'total_findings': self.total_findings,
            })

    async def _scan_and_stream(self, filepath: str, filename: str) -> int:
        """Read events and broadcast each alert IMMEDIATELY as it is detected.
        Yields to the event loop on every event so WebSocket frames are flushed
        within milliseconds of the user clicking Analyse."""
        count = 0
        try:
            with open(filepath, 'r') as fh:
                content = fh.read().strip()

            if content.startswith('['):
                events = json.loads(content)
            else:
                events = []
                for line in content.split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        events.append(json.loads(line))
                    except Exception:
                        pass

            batch_size = 50
            alert_batch = []
            
            for idx, raw_event in enumerate(events):
                if not self.is_running:
                    break

                if 'alert_id' in raw_event:
                    # Pre-computed high-speed alert!
                    alert = raw_event
                    self._alert_store.append(alert)
                    alert_batch.append(alert)
                    count += 1
                else:
                    raw_event['source_file'] = filename
                    normalized = normalize(raw_event)
                    alerts = self._engine.detect(normalized)
                    for alert in alerts:
                        self._alert_store.append(alert)
                        alert_batch.append(alert)
                        count += 1

                if len(alert_batch) >= 50:
                    await self._broadcast(alert_batch)
                    alert_batch = []

                if idx > 0 and idx % batch_size == 0:
                    # 50 alerts / 0.1s = ~500 events per second.
                    await asyncio.sleep(0.1)

            if alert_batch:
                await self._broadcast(alert_batch)

        except Exception:
            pass
        return count

    async def _scan_file(self, filepath: str, filename: str) -> list:
        """Legacy method kept for compatibility — delegates to stream variant."""
        findings = []
        try:
            with open(filepath, 'r') as fh:
                content = fh.read().strip()
            if content.startswith('['):
                events = json.loads(content)
            else:
                events = []
                for line in content.split('\n'):
                    if not line.strip():
                        continue
                    try:
                        events.append(json.loads(line))
                    except Exception:
                        pass
            for raw_event in events:
                if not self.is_running:
                    return findings
                raw_event['source_file'] = filename
                normalized = normalize(raw_event)
                findings.extend(self._engine.detect(normalized))
        except Exception:
            pass
        return findings
