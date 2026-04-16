import os
from dotenv import load_dotenv
load_dotenv()

GEMINI_API_KEY        = os.getenv('GEMINI_API_KEY', '')
INPUT_MODE            = os.getenv('INPUT_MODE', 'simulate')       # 'simulate' or 'file'
SAMPLE_LOG_FILE       = os.getenv('SAMPLE_LOG_FILE', 'sample_logs.json')

# Detection thresholds — these are read by /settings GET and written by /settings POST
BRUTE_FORCE_THRESHOLD   = int(os.getenv('BRUTE_FORCE_THRESHOLD', '5'))
BRUTE_FORCE_WINDOW_SEC  = int(os.getenv('BRUTE_FORCE_WINDOW_SEC', '60'))
BEACON_INTERVAL_VARIANCE= float(os.getenv('BEACON_INTERVAL_VARIANCE', '0.15'))
EXFIL_THRESHOLD_BYTES   = int(os.getenv('EXFIL_THRESHOLD_BYTES', '10485760'))
CORRELATION_WINDOW_SEC  = int(os.getenv('CORRELATION_WINDOW_SEC', '300'))
GEMINI_RATE_LIMIT_SEC   = int(os.getenv('GEMINI_RATE_LIMIT_SEC', '10'))

ADMIN_WHITELIST         = set(os.getenv('ADMIN_WHITELIST', '192.168.1.1').split(','))

LOG_FILES_DIR           = os.path.join(os.path.dirname(__file__), 'fake_logs')
TOTAL_LOG_FILES         = 1
