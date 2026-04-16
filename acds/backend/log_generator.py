import os
import json
import random
from datetime import datetime, timedelta
import config

ATTACK_IPS = [
    '103.21.244.1', '91.108.4.55', '45.33.32.156',
    '198.51.100.22', '201.12.88.9', '104.18.23.41',
]
INTERNAL_IPS = ['192.168.1.50', '10.0.0.5', '10.0.0.12']

def _ts(offset_seconds=0):
    return (datetime.utcnow() + timedelta(seconds=offset_seconds)).isoformat()

def _brute_force(ip, count=1):
    """Generates rapid 401 login attempts — triggers BruteForce detection."""
    return [
        {'timestamp': _ts(i * 4), 'src_ip': ip, 'layer': 'application',
         'method': 'POST', 'endpoint': '/login', 'status_code': 401,
         'payload_size': 256, 'user_agent': 'python-requests/2.28.0'}
        for i in range(count)
    ]

def _c2_beacon(ip, count=1):
    """Generates regular-interval outbound packets — triggers C2Beacon detection."""
    return [
        {'timestamp': _ts(i * 30), 'src_ip': ip, 'dst_ip': '185.220.101.55',
         'layer': 'network', 'dst_port': 443, 'protocol': 'TCP',
         'bytes_sent': random.randint(200, 600),
         'duration_ms': random.randint(80, 120), 'flags': 'SYN-ACK'}
        for i in range(count)
    ]

def _exfil(ip):
    """Generates a massive outbound data transfer — triggers Exfiltration detection."""
    return [
        {'timestamp': _ts(), 'src_ip': ip, 'dst_ip': '52.84.22.196',
         'layer': 'network', 'dst_port': 443, 'protocol': 'TCP',
         'bytes_sent': random.randint(config.EXFIL_THRESHOLD_BYTES + 1_000_000,
                                      config.EXFIL_THRESHOLD_BYTES * 4),
         'duration_ms': 8400, 'flags': 'PSH-ACK'}
    ]

def _correlated(ip):
    """Same IP hits both network and application layer — triggers Cross-Layer Correlator."""
    return [
        {'timestamp': _ts(0),  'src_ip': ip, 'dst_ip': '10.0.0.5',
         'layer': 'network', 'dst_port': 22, 'protocol': 'TCP',
         'bytes_sent': 1024, 'duration_ms': 200, 'flags': 'SYN'}
    ]

# Only 4 attack scenarios — no normal traffic, no false positives
SCENARIOS = [
    lambda: _brute_force(random.choice(ATTACK_IPS)),
    lambda: _c2_beacon(random.choice(ATTACK_IPS)),
    lambda: _exfil(random.choice(ATTACK_IPS)),
    lambda: _correlated(random.choice(ATTACK_IPS)),
]

SCENARIO_NAMES = ['BruteForce', 'C2Beacon', 'Exfiltration', 'CorrelatedAttack']

def generate_fake_logs():
    """
    Create fake_logs/ folder and write log_001.log through log_100.log.
    Each file is NDJSON: one JSON event per line.
    Only 4 attack types: BruteForce, C2Beacon, Exfiltration, CorrelatedAttack.
    Skips if all 100 files already exist.
    """
    os.makedirs(config.LOG_FILES_DIR, exist_ok=True)
    existing = [f for f in os.listdir(config.LOG_FILES_DIR) if f.endswith('.log')]
    if len(existing) >= config.TOTAL_LOG_FILES:
        print(f"[LogGen] {config.TOTAL_LOG_FILES} log files already present — skipping.")
        return

    print(f"[LogGen] Generating {config.TOTAL_LOG_FILES} fake log files (4 attack types only)...")
    for i in range(1, config.TOTAL_LOG_FILES + 1):
        filepath = os.path.join(config.LOG_FILES_DIR, f"log_{i:03d}.log")
        # Round-robin through 4 scenarios so distribution is even
        scenario_idx = (i - 1) % 4
        ip = random.choice(ATTACK_IPS)
        if scenario_idx == 0:
            events = _brute_force(ip, count=random.randint(10, 20))
        elif scenario_idx == 1:
            events = _c2_beacon(ip, count=random.randint(5, 8))
        elif scenario_idx == 2:
            events = _exfil(ip)
        else:
            events = _correlated(ip)

        with open(filepath, 'w') as f:
            for ev in events:
                f.write(json.dumps(ev) + '\n')

    print(f"[LogGen] Done. {config.TOTAL_LOG_FILES} files in {config.LOG_FILES_DIR}")
