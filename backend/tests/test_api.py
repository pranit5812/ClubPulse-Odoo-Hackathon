import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.seed_data import seed_database

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    seed_database(force=False)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data

def test_auth_login():
    # Valid student login
    response = client.post("/api/auth/login", json={
        "email": "student@clubpulse.edu",
        "password": "student123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "student@clubpulse.edu"
    assert data["user"]["membership_status"] == "active"

    # Invalid password
    bad_resp = client.post("/api/auth/login", json={
        "email": "student@clubpulse.edu",
        "password": "wrongpassword"
    })
    assert bad_resp.status_code == 401

def test_duplicate_member_registration():
    # Attempt to register member with already existing email
    response = client.post("/api/members", json={
        "full_name": "Duplicate Student",
        "email": "student@clubpulse.edu",
        "roll_number": "STU-DUP",
        "department": "IT",
        "membership_type": "annual",
        "dues_paid_paise": 50000
    })
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]

def test_events_and_ticket_booking():
    # Login as student
    login_resp = client.post("/api/auth/login", json={
        "email": "student@clubpulse.edu",
        "password": "student123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get events
    events_resp = client.get("/api/events")
    assert events_resp.status_code == 200
    events = events_resp.json()
    assert len(events) > 0
    event_id = events[0]["id"]

    # Book ticket
    book_resp = client.post("/api/tickets/book", json={
        "event_id": event_id,
        "quantity": 1
    }, headers=headers)
    assert book_resp.status_code == 200
    ticket = book_resp.json()
    assert ticket["is_member_discount_applied"] is True
    assert "qr_token" in ticket

    # Login as organizer to check in
    org_login = client.post("/api/auth/login", json={
        "email": "organizer@clubpulse.edu",
        "password": "organizer123"
    })
    org_token = org_login.json()["access_token"]
    org_headers = {"Authorization": f"Bearer {org_token}"}

    # Perform check in
    checkin_resp = client.post("/api/tickets/check-in", json={
        "qr_token": ticket["qr_token"]
    }, headers=org_headers)
    assert checkin_resp.status_code == 200
    assert checkin_resp.json()["success"] is True

    # Duplicate check-in should be rejected
    dup_checkin = client.post("/api/tickets/check-in", json={
        "qr_token": ticket["qr_token"]
    }, headers=org_headers)
    assert dup_checkin.status_code == 200
    assert dup_checkin.json()["success"] is False
    assert "Duplicate check-in rejected" in dup_checkin.json()["message"]

    # Re-registration for the same event should be rejected
    dup_book_resp = client.post("/api/tickets/book", json={
        "event_id": event_id,
        "quantity": 1
    }, headers=headers)
    assert dup_book_resp.status_code == 400
    assert "already enrolled" in dup_book_resp.json()["detail"].lower()

def test_operational_risk_engine():
    # Login as admin
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@clubpulse.edu",
        "password": "admin123"
    })
    token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/risk/evaluate", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "readiness_score" in data
    assert 0 <= data["readiness_score"] <= 100
    assert "score_formula" in data
    assert len(data["risk_items"]) > 0
    # Every risk item must have required explainable fields
    for item in data["risk_items"]:
        assert "id" in item
        assert "severity" in item
        assert "explanation" in item
        assert "recommended_action" in item
        assert "source_record" in item

def test_live_club_simulator_non_mutating():
    # Login as organizer
    org_login = client.post("/api/auth/login", json={
        "email": "organizer@clubpulse.edu",
        "password": "organizer123"
    })
    token = org_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate hypothetical scenario
    sim_resp = client.post("/api/simulator/simulate", json={
        "event_id": "evt_hackathon2026",
        "target_capacity": 250,
        "member_price_paise": 20000,
        "non_member_price_paise": 35000,
        "expected_attendance_rate": 0.90,
        "member_ratio": 0.50,
        "estimated_expenses_paise": 4000000,
        "reserve_threshold_paise": 500000
    }, headers=headers)
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert "proposed_scenario" in sim_data
    assert "variance" in sim_data
    assert "assumptions_statement" in sim_data

    # Verify that the live event in database was NOT modified by simulate call
    event_resp = client.get("/api/events/evt_hackathon2026")
    live_event = event_resp.json()
    assert live_event["capacity"] == 200  # Still 200, unchanged!

def test_semester_handover_report():
    # Login as treasurer
    trs_login = client.post("/api/auth/login", json={
        "email": "treasurer@clubpulse.edu",
        "password": "treasurer123"
    })
    token = trs_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/reports/handover", headers=headers)
    assert response.status_code == 200
    report = response.json()
    assert "opening_liquid_cash_paise" in report
    assert "closing_liquid_cash_paise" in report
    assert "executive_recommendations" in report

    # Test CSV export
    csv_resp = client.get("/api/reports/handover/export/csv", headers=headers)
    assert csv_resp.status_code == 200
    assert "CLUBPULSE SEMESTER HANDOVER REPORT" in csv_resp.text
