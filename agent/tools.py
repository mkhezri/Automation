"""
Agent tools — callable by Claude via tool_use.
Each function maps to one tool definition.
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any


# ---------- Tool: get_market_data ----------

def get_market_data(product_type: str, index_name: str) -> dict[str, Any]:
    """
    Returns latest Platts index reference price.
    In production: call Platts API or internal data feed.
    Currently returns realistic demo values.
    """
    _demo = {
        "Platts CFR 65% Fe": {"price": 107.5, "unit": "USD/DMT", "date": "2026-06-13"},
        "Platts CFR 61% Fe": {"price":  93.2, "unit": "USD/DMT", "date": "2026-06-13"},
        "Platts CFR 58% Fe": {"price":  78.8, "unit": "USD/DMT", "date": "2026-06-13"},
    }
    data = _demo.get(index_name, {"price": None, "unit": "USD/DMT", "date": "N/A"})
    return {
        "product_type": product_type,
        "index": index_name,
        "reference_price": data["price"],
        "unit": data["unit"],
        "as_of": data["date"],
        "note": "Demo values — connect to live Platts API in production"
    }


# ---------- Tool: calculate_effective_price ----------

def calculate_effective_price(
    base_index_price: float,
    premium_discount: float,
    actual_fe: float,
    base_fe: float,
    bonus_per_pct: float = 1.75,
    penalty_per_pct: float = 1.75,
) -> dict[str, Any]:
    """
    Calculates effective purchase price applying premium/discount and Fe adjustment.
    """
    diff = actual_fe - base_fe
    adjustment = diff * (bonus_per_pct if diff >= 0 else penalty_per_pct)
    effective = base_index_price + premium_discount + adjustment
    return {
        "base_index_price": base_index_price,
        "premium_discount": premium_discount,
        "fe_diff": round(diff, 2),
        "fe_adjustment": round(adjustment, 2),
        "effective_price": round(effective, 2),
        "unit": "USD/DMT"
    }


# ---------- Tool: evaluate_contract_risk ----------

def evaluate_contract_risk(
    bonus_clause: str,
    penalty_clause: str,
    reject_clause: str,
    payment_stages: list[dict],
    delivery_term: str,
) -> dict[str, Any]:
    """
    Scans contract clauses for risk flags.
    """
    flags = []
    risk = "low"

    if not bonus_clause:
        flags.append("⚠️ بند جایزه (Bonus) تعریف نشده — در صورت کیفیت بالاتر از تعهد، خریدار سود نمی‌برد.")
    if not penalty_clause:
        flags.append("🔴 بند جریمه (Penalty) تعریف نشده — ریسک بالا در کیفیت پایین‌تر از تعهد.")
        risk = "high"
    if not reject_clause:
        flags.append("🔴 شرط ریجکت تعریف نشده — خریدار حق رد محموله را ندارد.")
        risk = "high"

    total_pct = sum(float(s.get("percent") or 0) for s in payment_stages if s.get("percent"))
    if total_pct > 0 and abs(total_pct - 100) > 0.01:
        flags.append(f"⚠️ مجموع مراحل پرداخت {total_pct:.0f}٪ است — باید ۱۰۰٪ باشد.")
        if risk == "low":
            risk = "medium"

    prepay = [s for s in payment_stages if "pre" in s.get("trigger", "").lower() or "پیش" in s.get("trigger", "")]
    if prepay and float(prepay[0].get("percent") or 0) > 30:
        flags.append(f"⚠️ پیش‌پرداخت {prepay[0]['percent']}٪ بالاست — ریسک مالی قبل از تحویل.")
        if risk == "low":
            risk = "medium"

    if delivery_term == "CFR" and not any("freight" in s.get("trigger", "").lower() for s in payment_stages):
        flags.append("ℹ️ ترم CFR: هزینه حمل در مراحل پرداخت مشخص نشده.")

    if not flags:
        flags.append("✅ بررسی اولیه بدون پرچم ریسک برجسته.")

    return {"risk_level": risk, "flags": flags}


# ---------- Tool: send_email ----------

def send_email(to: str, subject: str, html_body: str) -> dict[str, str]:
    """
    Sends email via SMTP (configured via env vars).
    Falls back to console log in dev mode.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not smtp_host:
        print(f"[DEV] Would send email to {to}: {subject}")
        return {"status": "dev_mode", "message": f"Dev mode — email to {to} logged only."}

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = smtp_user
    msg["To"]      = to
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(smtp_host, smtp_port) as s:
        s.starttls()
        s.login(smtp_user, smtp_pass)
        s.sendmail(smtp_user, [to], msg.as_string())

    return {"status": "sent", "message": f"Email sent to {to}"}


# ---------- Tool definitions for Claude ----------

TOOL_DEFINITIONS = [
    {
        "name": "get_market_data",
        "description": "Get the latest Platts reference price for an iron ore index.",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_type": {"type": "string", "description": "e.g. Iron Ore Concentrate"},
                "index_name":   {"type": "string", "description": "e.g. Platts CFR 65% Fe"}
            },
            "required": ["product_type", "index_name"]
        }
    },
    {
        "name": "calculate_effective_price",
        "description": "Calculate effective purchase price after premium/discount and Fe grade adjustment.",
        "input_schema": {
            "type": "object",
            "properties": {
                "base_index_price": {"type": "number"},
                "premium_discount":  {"type": "number"},
                "actual_fe":         {"type": "number", "description": "Actual Fe% from lab"},
                "base_fe":           {"type": "number", "description": "Base Fe% (contract grade)"},
                "bonus_per_pct":     {"type": "number", "default": 1.75},
                "penalty_per_pct":   {"type": "number", "default": 1.75}
            },
            "required": ["base_index_price", "premium_discount", "actual_fe", "base_fe"]
        }
    },
    {
        "name": "evaluate_contract_risk",
        "description": "Evaluate contract clauses and payment terms for procurement risk.",
        "input_schema": {
            "type": "object",
            "properties": {
                "bonus_clause":   {"type": "string"},
                "penalty_clause": {"type": "string"},
                "reject_clause":  {"type": "string"},
                "payment_stages": {"type": "array", "items": {"type": "object"}},
                "delivery_term":  {"type": "string"}
            },
            "required": ["bonus_clause", "penalty_clause", "reject_clause", "payment_stages", "delivery_term"]
        }
    },
    {
        "name": "send_email",
        "description": "Send an HTML email to a recipient.",
        "input_schema": {
            "type": "object",
            "properties": {
                "to":        {"type": "string"},
                "subject":   {"type": "string"},
                "html_body": {"type": "string"}
            },
            "required": ["to", "subject", "html_body"]
        }
    }
]

TOOL_FUNCTIONS = {
    "get_market_data":        get_market_data,
    "calculate_effective_price": calculate_effective_price,
    "evaluate_contract_risk": evaluate_contract_risk,
    "send_email":             send_email,
}
