# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 4.1.x (current) | ✅ Yes |
| 4.0.x | ⚠️ Critical fixes only |
| < 4.0 | ❌ No |

---

## Scope

This security policy covers the ACDS — AI Cyber Defense System repository, including:
- `acds/backend/` — FastAPI server and detection engine
- `acds/frontend_existing/` — React dashboard
- All configuration files and environment variable handling

---

## Reporting a Vulnerability

If you discover a security vulnerability in ACDS, please **do not open a public GitHub issue**.

**Report privately via:**
- GitHub: [@ak4hit](https://github.com/ak4hit)

Please include:
1. A description of the vulnerability
2. Steps to reproduce the issue
3. The potential impact / attack scenario
4. Any suggested remediation (optional)

You will receive an acknowledgement within **72 hours** and a resolution timeline within **7 days** for confirmed vulnerabilities.

---

## Known Security Considerations

### In-Memory State
ACDS stores all alerts, connected WebSocket clients, and geo-lookup cache entirely in-memory. There is no database persistence. A server restart clears all data — by design for this demo environment.

### CORS Policy
The backend is configured with `allow_origins=['*']` for hackathon demo purposes. Before any production deployment, restrict this to the specific frontend origin.

### API Authentication
ACDS does not implement authentication or authorization on API endpoints. All endpoints are publicly accessible. This is intentional for the demo environment and must be addressed before production deployment.

### Gemini API Key
The `GEMINI_API_KEY` is loaded from environment variables and never logged or returned in API responses. Do **not** commit a populated `.env` file — it is listed in `.gitignore`.

### IP Geolocation
The `GET /geo/{ip}` endpoint proxies requests to `ip-api.com`. Be aware of ip-api.com's rate limits (45 requests/minute for the free tier). The server-side cache mitigates repeated lookups for the same IP.

### WARP Mode
The `POST /warp` endpoint streams 5 000 events from `speed_test_manifest.json` at high throughput. Exposing this endpoint publicly without rate limiting could allow a denial-of-service via repeated WARP triggers.

---

## Recommendations for Production Deployment

- [ ] Add JWT or API-key authentication to all endpoints
- [ ] Restrict CORS to specific frontend origin
- [ ] Persist alerts to a database (PostgreSQL recommended)
- [ ] Add rate limiting to `/warp`, `/upload`, and `/playbooks/generate/{id}`
- [ ] Rotate `GEMINI_API_KEY` regularly and store in a secrets manager
- [ ] Deploy behind HTTPS with a valid TLS certificate
- [ ] Add input validation and file size limits to `POST /upload`

---

## Acknowledgements

This project was built as a hackathon prototype. The security model is intentionally simplified for demonstration. All threat detection, playbook generation, and geolocation features are for educational and demonstration purposes only.
