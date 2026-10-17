import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.seed_data import seed_database
from app.database.mongodb import get_database
from app.services.readiness_service import calculate_event_readiness, list_events_readiness_summary
from app.services.correlation_service import evaluate_correlated_risks, take_risk_action
from app.services.notification_service import create_notification, list_notifications
from app.services.simulator_service import SimulatorService
from app.schemas.simulator import SimulationRequest
from app.schemas.correlation import RiskActionRequest

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    seed_database(force=False)

def get_auth_token(email: str = "organizer@clubpulse.edu", password: str = "organizer123"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]

# 1. Event readiness scoring derived from real database records
def test_event_readiness_scoring():
    token = get_auth_token()
    resp = client.get("/api/readiness/events", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    events_summary = resp.json()
    assert len(events_summary) > 0

    first_event_id = events_summary[0]["event_id"]
    detail_resp = client.get(f"/api/readiness/events/{first_event_id}", headers={"Authorization": f"Bearer {token}"})
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert 0 <= detail["overall_readiness_score"] <= 100
    assert detail["overall_status"] in ["ready", "attention_required", "at_risk"]
    assert len(detail["category_scores"]) == 5
    assert "formula_explanation" in detail
    assert detail["weights_used"]["financial"] == 0.25

# 2. Missing information and critical blockers
def test_missing_data_and_blockers():
    db = get_database()
    # Create an event with 0 budget and 0 capacity
    db["events"].insert_one({
        "id": "evt_incomplete",
        "title": "Incomplete Event",
        "event_date": "2026-12-01",
        "capacity": 0,
        "estimated_budget_paise": 0,
        "is_published": True
    })
    token = get_auth_token()
    detail_resp = client.get("/api/readiness/events/evt_incomplete", headers={"Authorization": f"Bearer {token}"})
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    # Should flag missing_data in financial and capacity categories
    cat_statuses = {c["category"]: c["status"] for c in detail["category_scores"]}
    assert cat_statuses["financial"] == "missing_data"
    assert cat_statuses["capacity"] == "missing_data"

# 3. Financial risk calculations & Explainable Insights
def test_explainable_financial_insights():
    token = get_auth_token("treasurer@clubpulse.edu", "treasurer123")
    resp = client.get("/api/transactions/explainable-insights", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "actual_income_paise" in data
    assert "available_cash_paise" in data
    assert "pending_reimbursements_paise" in data
    assert "event_insights" in data
    assert "historical_comparison" in data
    assert data["historical_comparison"]["has_sufficient_history"] is False
    assert "single-semester" in data["historical_comparison"]["limitation_statement"].lower()

# 4. Cross-Module Risk Correlation
def test_cross_module_risk_correlation():
    token = get_auth_token()
    resp = client.get("/api/intelligence/risks", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "readiness_index" in data
    assert len(data["risks"]) > 0
    # Every risk must have affected entities and traceable evidence
    for risk in data["risks"]:
        assert len(risk["affected_entities"]) > 0
        assert "evidence" in risk
        assert len(risk["relationship_explanation"]) > 10

# 5. Duplicate Risk Suppression
def test_duplicate_risk_suppression():
    db = get_database()
    initial_risks_count = db["correlated_risks"].count_documents({})
    # Evaluate twice in a row
    evaluate_correlated_risks()
    count_after_eval1 = db["correlated_risks"].count_documents({})
    evaluate_correlated_risks()
    count_after_eval2 = db["correlated_risks"].count_documents({})
    # Count should remain identical, no duplicate risk records created
    assert count_after_eval1 == count_after_eval2

# 6. Action Acknowledgment & Resolution
def test_risk_action_and_audit():
    token = get_auth_token()
    res = evaluate_correlated_risks()
    target_risk = res.risks[0]

    # Acknowledge
    ack_resp = client.post(
        f"/api/intelligence/risks/{target_risk.id}/action",
        json={"action": "acknowledge", "notes": "Officer assigned to review"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "acknowledged"

    # Resolve
    res_resp = client.post(
        f"/api/intelligence/risks/{target_risk.id}/action",
        json={"action": "resolve", "notes": "Staffing resolved"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "resolved"

    # Check Audit Log recorded
    audit_resp = client.get("/api/audit-logs", headers={"Authorization": f"Bearer {token}"})
    assert audit_resp.status_code == 200
    logs = audit_resp.json()["logs"]
    assert any(l["entity_id"] == target_risk.id for l in logs)

# 7. Notification Deduplication and Visibility
def test_notification_deduplication():
    token = get_auth_token()
    # Create notification with specific key
    notif1 = create_notification(
        title="Test Alert",
        message="Important notice",
        category="readiness",
        severity="critical",
        target_roles=["organizer"],
        deduplication_key="test_dedup_key_01"
    )
    assert notif1 is not None

    # Immediate second create with same key should be suppressed
    notif2 = create_notification(
        title="Test Alert",
        message="Important notice",
        category="readiness",
        severity="critical",
        target_roles=["organizer"],
        deduplication_key="test_dedup_key_01"
    )
    assert notif2 is None

    # Read notification
    resp = client.get("/api/notifications", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["unread_count"] >= 1

# 8. Baseline-versus-scenario comparison
def test_simulator_scenario_comparison():
    sim_req = SimulationRequest(
        event_id="evt_hackathon2026",
        target_capacity=300,
        member_price_paise=20000,
        non_member_price_paise=40000,
        expected_attendance_rate=0.90,
        member_ratio=0.50,
        estimated_expenses_paise=3000000,
        reserve_threshold_paise=500000
    )
    res = SimulatorService.simulate(sim_req)
    assert res.current_plan is not None
    assert res.proposed_scenario is not None
    assert "surplus_delta_paise" in res.variance
    assert len(res.key_sensitivity_drivers) > 0
    assert "needed_volunteers" in res.volunteer_impact

# 9. Simulator isolation from real records (does not mutate)
def test_simulator_isolation():
    db = get_database()
    orig_event = db["events"].find_one({"id": "evt_hackathon2026"})
    orig_capacity = orig_event["capacity"]
    orig_tickets = db["tickets"].count_documents({})
    orig_txns = db["transactions"].count_documents({})

    sim_req = SimulationRequest(
        event_id="evt_hackathon2026",
        target_capacity=500,
        estimated_expenses_paise=9999999
    )
    SimulatorService.simulate(sim_req)

    # Verify real DB records were NOT mutated
    after_event = db["events"].find_one({"id": "evt_hackathon2026"})
    assert after_event["capacity"] == orig_capacity
    assert db["tickets"].count_documents({}) == orig_tickets
    assert db["transactions"].count_documents({}) == orig_txns

# 10. Action Center aggregation and update
def test_action_center():
    token = get_auth_token()
    resp = client.get("/api/action-center/items", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "total_actions" in data
    assert len(data["items"]) > 0

    first_item = data["items"][0]
    update_resp = client.patch(
        f"/api/action-center/items/{first_item['id']}",
        json={"status": "in_progress", "resolution_notes": "Working on it"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "in_progress"

# 11. Unauthorized access protection
def test_unauthorized_access():
    student_token = get_auth_token("student@clubpulse.edu", "student123")
    # Student should be forbidden from accessing organizer readiness and audit logs
    r1 = client.get("/api/readiness/events", headers={"Authorization": f"Bearer {student_token}"})
    assert r1.status_code == 403

    r2 = client.get("/api/audit-logs", headers={"Authorization": f"Bearer {student_token}"})
    assert r2.status_code == 403

    r3 = client.get("/api/transactions/explainable-insights", headers={"Authorization": f"Bearer {student_token}"})
    assert r3.status_code == 403
