"""
KAU Procurement AI Agent — powered by Claude.
Runs an agentic loop: Claude calls tools until it produces a final answer.
"""

import json
import os
import anthropic
from models import OpportunityPayload, AgentResponse
from tools import TOOL_DEFINITIONS, TOOL_FUNCTIONS

_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

SYSTEM_PROMPT = """You are KAU Procurement AI Agent — an expert in iron ore commodity trading, contract analysis, and supply chain risk management.

Your tasks when analyzing a purchase opportunity:
1. Retrieve the latest Platts market reference price for the relevant index.
2. Calculate the effective purchase price using the stated Fe grade, premium/discount, bonus/penalty clauses.
3. Evaluate contract risk across clauses (bonus, penalty, rejection) and payment structure.
4. Provide a clear, structured Persian-language summary with:
   - قیمت مرجع بازار و قیمت موثر محاسبه‌شده
   - سطح ریسک قرارداد (کم / متوسط / زیاد)
   - پرچم‌های ریسک مشخص
   - توصیه عملیاتی (تأیید / مذاکره / رد)

Always respond in Farsi (Persian). Be concise and actionable.
"""


def analyze_opportunity(payload: OpportunityPayload) -> AgentResponse:
    """Runs the Claude agentic loop and returns a structured result."""

    # Extract first Fe lab value for price calculation
    actual_fe = _extract_fe(payload)

    user_content = _build_user_message(payload, actual_fe)
    messages = [{"role": "user", "content": user_content}]

    result_text    = ""
    risk_level     = "medium"
    max_iterations = 6

    for _ in range(max_iterations):
        response = _client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
        )

        # Collect text from this turn
        for block in response.content:
            if hasattr(block, "text"):
                result_text = block.text

        if response.stop_reason == "end_turn":
            break

        if response.stop_reason == "tool_use":
            # Execute all tool calls
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    fn   = TOOL_FUNCTIONS.get(block.name)
                    out  = fn(**block.input) if fn else {"error": f"Unknown tool: {block.name}"}
                    tool_results.append({
                        "type":        "tool_result",
                        "tool_use_id": block.id,
                        "content":     json.dumps(out, ensure_ascii=False),
                    })

            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user",      "content": tool_results})
        else:
            break

    # Detect risk level from final text
    if "زیاد" in result_text or "🔴" in result_text:
        risk_level = "high"
    elif "کم" in result_text or "✅" in result_text:
        risk_level = "low"

    return AgentResponse(result=result_text, risk_level=risk_level)


def _extract_fe(payload: OpportunityPayload) -> float:
    """Returns the first available lab Fe value from analyses."""
    for entry in payload.analyses:
        fe = entry.analysis.get("fe", {})
        if isinstance(fe, dict):
            for key in ("lab", "sgs", "contract"):
                v = fe.get(key)
                if v:
                    try:
                        return float(v)
                    except ValueError:
                        pass
    try:
        return float(payload.base_grade) if payload.base_grade else 62.0
    except ValueError:
        return 62.0


def _build_user_message(payload: OpportunityPayload, actual_fe: float) -> str:
    stages_text = ""
    for s in payload.payment_stages:
        stages_text += f"  - {s.percent}٪: {s.trigger}\n"

    return f"""لطفاً این فرصت خرید را تحلیل کن:

**شماره فرصت:** {payload.opp_number}
**تأمین‌کننده:** {payload.supplier_name}
**کالا:** {payload.product_type}
**وزن:** {payload.quantity_mt} MT
**ترم تحویل:** {payload.delivery_term} — {payload.delivery_port}
**عیار پایه (قراردادی):** {payload.base_grade}٪ Fe
**عیار واقعی آزمایشگاه:** {actual_fe}٪ Fe
**نوع قیمت:** {payload.price_type}
**شاخص مرجع:** {payload.platts_index}
**Premium/Discount:** {payload.premium_discount} USD/DMT
**قیمت ثابت:** {payload.fixed_price or '—'} USD/DMT
**لِیکن:** {payload.laycan}

**بند جایزه:** {payload.bonus_clause or 'تعریف نشده'}
**بند جریمه:** {payload.penalty_clause or 'تعریف نشده'}
**شرط ریجکت:** {payload.reject_clause or 'تعریف نشده'}

**مراحل پرداخت:**
{stages_text or '  تعریف نشده'}

**معیار آنالیز:** {payload.analysis_basis}
**معیار وزن:** {payload.weight_basis}

ابتدا قیمت مرجع بازار را دریافت کن، سپس قیمت موثر را محاسبه کن و ریسک قرارداد را ارزیابی نما.
"""
