from pydantic import BaseModel
from typing import Any, Optional


class AnalysisEntry(BaseModel):
    tonnage: str = ""
    analysis: dict[str, Any] = {}


class PaymentStage(BaseModel):
    percent: str = ""
    trigger: str = ""


class OpportunityPayload(BaseModel):
    opp_number: str = ""
    date: str = ""
    supplier_id: str = ""
    supplier_name: str = ""
    registry_no: str = ""
    national_id: str = ""
    supplier_type: str = ""
    supplier_email: str = ""
    product_type: str = ""
    quantity_mt: str = ""
    producer_mine: str = ""
    delivery_term: str = ""
    delivery_port: str = ""
    dest_country: str = ""
    laycan: str = ""
    base_grade: str = ""
    price_type: str = ""
    platts_index: str = ""
    premium_discount: str = ""
    fixed_price: str = ""
    analyses: list[AnalysisEntry] = []
    bonus_clause: str = ""
    penalty_clause: str = ""
    reject_clause: str = ""
    payment_stages: list[PaymentStage] = []
    analysis_basis: str = ""
    weight_basis: str = ""
    status: str = "0"
    mgmt_comments: str = ""
    internal_notes: str = ""


class AgentResponse(BaseModel):
    result: str
    risk_level: str = "medium"   # low | medium | high
    recommended_action: Optional[str] = None
    email_draft: Optional[str] = None
