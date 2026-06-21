"""
KAU Procurement AI Agent — FastAPI server
Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

from models import OpportunityPayload, AgentResponse
from agent import analyze_opportunity

app = FastAPI(
    title="KAU Procurement AI Agent",
    version="1.0.0",
    description="AI-powered procurement automation for mining commodity trading",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict to your Apps Script domain in production
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "KAU Agent"}


@app.post("/analyze", response_model=AgentResponse)
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
        raise HTTPException(status_code=500, detail=str(e))
