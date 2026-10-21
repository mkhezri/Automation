# ECC Commercial Pilot — Initial Architecture & Security Review
Date: 2026-10-22
Branch: pilot/ecc-commercial-agents
Scope: static source inspection only; no runtime or penetration testing.

## Existing architecture
- Google Apps Script web UI and Google Sheets storage (apps_script/Code.gs, Index.html).
- FastAPI /analyze endpoint (agent/main.py).
- Anthropic tool-calling loop (agent/agent.py) with pricing, risk and SMTP email tools (agent/tools.py).
- This branch is for experiments; do not deploy to production without approval.

## Findings (prioritized)
1. CRITICAL: /analyze has no authentication in inspected main.py; CORS allow_origins=['*'] is broad, though CORS is not authentication. Add API authentication, authorization, rate limits and restricted origins as appropriate.
2. CRITICAL: send_email is exposed as an agent tool and invoked directly by the model without a human approval gate. Remove from automatic tool list until an explicit approval workflow is implemented.
3. HIGH: Apps Script deployment guide suggests Execute as Me / Access Anyone. This can expose privileged spreadsheet/email operations if deployed as written. Restrict deployment and enforce identity/roles server-side.
4. HIGH: get_market_data returns hard-coded demo Platts values dated 2026-06-13, while tool description calls them latest. Disable real-market claims and require licensed verified market data with timestamp.
5. HIGH: FastAPI returns raw exception strings to callers, potentially leaking internals. Replace with generic public errors and private structured logs.
6. HIGH: Apps Script sends payload to AGENT_URL without an application authentication header in inspected Code.gs. Design shared auth or identity-aware gateway before deployment.
7. MEDIUM: Apps Script HTML uses ALLOWALL frame policy; reassess clickjacking exposure. Email HTML interpolates supplier fields without escaping; encode untrusted values.
8. MEDIUM: Risk evaluator makes simplistic assumptions (e.g. missing bonus/rejection implies risk), and price calculation uses default $1.75/Fe percentage point regardless of negotiated formula. Treat outputs as advisory, not settlement-ready.
9. MEDIUM: agent/agent.py constructs Anthropic client at import using os.environ['ANTHROPIC_API_KEY']; missing secret may prevent app startup before endpoint's own check.
10. MEDIUM: Frontend Index.html references PropertiesService in browser JS; likely ReferenceError. Verify in browser tests.
11. MEDIUM: getNextOppNumber derives identifier from row count, potentially duplicate under concurrent requests. Add atomic sequence or UUID.
12. MEDIUM: .gitignore excludes .env, but add secret scanning, dependency pinning, CI checks and protected branches.

## Proposed ECC-inspired modules (not installed)
- contract-review: source-cited clause comparison, buyer/seller risk, missing information; human legal approval.
- project-actions: action extraction with source, owner, deadline and confidence; no invented facts.
- shared rules: no external send, deletion, payment, or contract modification without explicit approval.
- memory: Obsidian/Drive references with least privilege and audit log.

## Next steps
1. Add automated tests and security checks in this branch.
2. Introduce read-only agent tools and explicit approval gates.
3. Design authorization between Apps Script and FastAPI.
4. Use synthetic contracts and projects for pilot tests.
5. Obtain code review and approval before any merge or production deployment.

This review covers inspected source files, not deployed settings, credentials, access logs, GitHub branch protections, or full dependency/security scans.
