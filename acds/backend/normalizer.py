import uuid
from datetime import datetime
import utils

def normalize_network_log(raw: dict) -> dict:
    ip = raw.get('src_ip')
    geo = utils.get_geo(ip) if ip else None
    return {
        'event_id'  : f"EVT-{uuid.uuid4().hex[:8].upper()}",
        'timestamp' : raw.get('timestamp', datetime.utcnow().isoformat()),
        'src_ip'    : ip,
        'dst_ip'    : raw.get('dst_ip'),
        'layer'     : raw.get('layer', 'network'),
        'event_type': raw.get('event_type', 'connection'),
        'bytes'     : raw.get('bytes', raw.get('bytes_sent', 0)),
        'metadata'  : {
            'dst_port'   : raw.get('dst_port'),
            'protocol'   : raw.get('protocol'),
            'flags'      : raw.get('flags'),
            'duration_ms': raw.get('duration_ms'),
            'geolocation': geo,
        }
    }

def normalize_app_log(raw: dict) -> dict:
    endpoint = raw.get('endpoint', '')
    ip = raw.get('src_ip')
    geo = utils.get_geo(ip) if ip else None
    return {
        'event_id'  : f"EVT-{uuid.uuid4().hex[:8].upper()}",
        'timestamp' : raw.get('timestamp', datetime.utcnow().isoformat()),
        'src_ip'    : ip,
        'dst_ip'    : raw.get('dst_ip'), # app logs might omit this, but fallback to raw
        'layer'     : raw.get('layer', 'application'),
        'event_type': raw.get('event_type') or ('auth_attempt' if '/login' in endpoint else 'api_call'),
        'bytes'     : raw.get('bytes', raw.get('payload_size', 0)),
        'metadata'  : {
            'method'     : raw.get('method'),
            'endpoint'   : endpoint,
            'status_code': raw.get('status_code'),
            'user_agent' : raw.get('user_agent'),
            'geolocation': geo,
        }
    }

def normalize(raw: dict) -> dict:
    if raw.get('layer') == 'network' or 'dst_port' in raw:
        result = normalize_network_log(raw)
    else:
        result = normalize_app_log(raw)
    if 'source_file' in raw:
        result['source_file'] = raw['source_file']
    return result
