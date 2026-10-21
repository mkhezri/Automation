"""Pilot security regression tests. Run from agent/: pytest -q."""
from fastapi.testclient import TestClient
import main
from tools import TOOL_FUNCTIONS, TOOL_DEFINITIONS

def test_missing_configuration_fails_closed(monkeypatch):
    monkeypatch.delenv("AGENT_API_KEY", raising=False)
    client = TestClient(main.app)
    response = client.post("/analyze", json={})
    assert response.status_code == 503

def test_missing_or_wrong_key_rejected(monkeypatch):
    monkeypatch.setenv("AGENT_API_KEY", "pilot-test-secret")
    client = TestClient(main.app)
    assert client.post("/analyze", json={}).status_code == 401
    assert client.post("/analyze", json={}, headers={"X-API-Key": "wrong"}).status_code == 401

def test_no_email_tool_available_to_model():
    assert "send_email" not in TOOL_FUNCTIONS
    assert "send_email" not in {tool["name"] for tool in TOOL_DEFINITIONS}

def test_health_without_credentials():
    client = TestClient(main.app)
    assert client.get("/health").status_code == 200

def test_correct_key_reaches_analysis(monkeypatch):
    monkeypatch.setenv("AGENT_API_KEY", "pilot-test-secret")
    from models import AgentResponse
    monkeypatch.setattr(main, "analyze_opportunity", lambda payload: AgentResponse(result="test", risk_level="low"))
    client = TestClient(main.app)
    response = client.post("/analyze", json={}, headers={"X-API-Key": "pilot-test-secret"})
    assert response.status_code == 200
    assert response.json()["result"] == "test"
