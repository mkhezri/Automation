# ECC pilot — security patch 1

Only branch: `pilot/ecc-commercial-agents`. Do not merge or deploy until review.

## Implemented
- `POST /analyze` requires an `X-API-Key` matching server-side `AGENT_API_KEY`; missing server configuration fails closed (503), wrong/missing key returns 401.
- Apps Script forwards `AGENT_API_KEY` from Script Properties to FastAPI. Set a distinct strong secret on both sides; never commit it.
- Removed model access to `send_email` from exposed tool schema and dispatcher. The legacy SMTP function remains in source but is not callable by the AI tool loop.
- Removed wildcard CORS middleware from FastAPI (Apps Script bridge is server-to-server).
- Replaced raw exception messages returned to API callers with generic errors.
- Delayed Anthropic client construction until analysis, avoiding startup failure if the API key is absent.
- Added basic security regression tests (not yet executed in a deployed environment).

## Required before testing
1. In server environment set `AGENT_API_KEY` to a new random secret (alongside `ANTHROPIC_API_KEY`).
2. In Google Apps Script **Script Properties**, set `AGENT_API_KEY` to the same secret. Ensure `AGENT_URL` is HTTPS.
3. Install test dependencies `pip install pytest httpx` alongside `agent/requirements.txt`, then run `cd agent && pytest -q`.
4. Test unauthorized requests, authorized analysis, and confirm AI never invokes email.
5. Do not deploy Apps Script as `Anyone` with `Execute as Me` until identity/authorization design is reviewed.

## Remaining risks
- `sendRfqEmail` in Apps Script is still a directly callable sending function. Require server-side authorization, explicit user confirmation and audit trail before production.
- API key is a shared secret, not user-level identity; add per-user authorization, rate limiting, audit logging and secret rotation.
- `get_market_data` uses old demo Platts data; do not use it for live financial decisions.
- `Index.html` references `PropertiesService` in browser JS; fix and test.
- No runtime/deployment/secret scanning was performed. Static checks do not establish production security.

## Patch 2 (2026-10-22)
- Pilot-only `sendRfqEmail` now fails closed before sending. This intentionally disables RFQ dispatch in the pilot branch; production `main` is unchanged.
- Removed browser-side reference to server-only `PropertiesService` from `Index.html`.
- Clarified that `get_market_data` uses historical DEMO values, not live Platts data. The model's general system prompt still requests latest market data and should be adjusted before any use.
- Added a successful-authentication API regression test using a mocked analysis function.
- Tests were committed but not run in a verified Python runtime; deployment settings and owner notifications were not inspected.
