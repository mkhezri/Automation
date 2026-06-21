# KAU AI Agent Platform

Open-source AI Agent platform for Mining and Commodity Trading Companies.

## Architecture

```
┌─────────────────────────────────┐     ┌──────────────────────────────┐
│   Google Apps Script (Frontend) │────▶│  FastAPI Agent (Backend AI)  │
│   • Purchase opportunity form   │     │  • Claude claude-sonnet-4-6  │
│   • Google Sheets database      │◀────│  • Agentic tool loop         │
│   • Gmail email automation      │     │  • Price calculation         │
└─────────────────────────────────┘     │  • Risk evaluation           │
                                        └──────────────────────────────┘
```

## Features

| Feature | Status | Layer |
|---------|--------|-------|
| ثبت فرصت خرید (فرم کامل) | ✅ | Apps Script |
| ذخیره در Google Sheets | ✅ | Apps Script |
| ارسال ایمیل RFQ خودکار | ✅ | Apps Script / Gmail |
| تحلیل AI (قیمت + ریسک) | ✅ | FastAPI + Claude |
| محاسبه قیمت موثر (Fe Adj) | ✅ | Agent Tool |
| بررسی ریسک قرارداد | ✅ | Agent Tool |
| گردش کار (Workflow tracker) | ✅ | Apps Script |
| لیست و وضعیت فرصت‌ها | ✅ | Apps Script |

## Quick Start

### 1. Apps Script (فرم + دیتابیس)
```
apps_script/
├── Code.gs       ← backend logic + email + AI bridge
└── Index.html    ← full RTL form UI
```
See [`apps_script/README_SETUP.md`](apps_script/README_SETUP.md) for setup instructions.

### 2. AI Agent (FastAPI)
```bash
cd agent
cp .env.example .env
# Edit .env — add ANTHROPIC_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Then in Apps Script Script Properties:
- Key: `AGENT_URL`  Value: `https://your-server.com`

### 3. API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/analyze` | Run AI analysis on opportunity payload |

## Agent Tools

The Claude agent has access to:
- `get_market_data` — Latest Platts index reference price
- `calculate_effective_price` — Price after Fe adjustment + premium/discount
- `evaluate_contract_risk` — Scan bonus/penalty/rejection/payment clauses
- `send_email` — Send HTML email via SMTP

## Tech Stack
- **Frontend**: Google Apps Script + Vanilla JS (RTL/Farsi)
- **Database**: Google Sheets
- **Email**: Gmail API (via Apps Script)
- **AI Agent**: Python + FastAPI + Anthropic Claude
- **Model**: claude-sonnet-4-6

## Roadmap
- [ ] Shipment monitoring agent
- [ ] Contract document upload & PDF analysis
- [ ] ERP integration (SAP/Odoo)
- [ ] Multi-supplier tender comparison
- [ ] Live Platts API integration

## License
MIT
