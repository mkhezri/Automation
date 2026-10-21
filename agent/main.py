"""
KAU Procurement AI Agent — FastAPI server
Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Header, Depends
import os
import hmac

from models import OpportunityPayload, AgentResponse
from agent import analyze_opportunity

app = FastAPI(
    title="KAU Procurement AI Agent",
    version="1.0.0",
    description="AI-powered procurement automation for mining commodity trading",
)

def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = os.getenv("AGENT_API_KEY")
    if not expected:
        raise HTTPException(status_code=503, detail="Service authentication not configured")
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health():
    return {"status": "ok", "service": "KAU Agent"}


@app.post("/analyze", response_model=AgentResponse, dependencies=[Depends(require_api_key)])
def analyze(payload: OpportunityPayload):
    """
    Receives a purchase opportunity from Apps Script,
    runs the Claude agentic loop, returns structured analysis.
    """
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    try:
        return analyze_opportunity(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Analysis failed")
