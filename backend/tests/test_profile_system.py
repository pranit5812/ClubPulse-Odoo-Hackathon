import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.seed_data import seed_database

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database_state():
    """Ensure database has fresh seed data for test execution."""
    seed_database(force=False)

def login_user(email: str, password: str) -> dict:
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    data = resp.json()
    return {"token": data["access_token"], "user": data["user"], "headers": {"Authorization": f"Bearer {data['access_token']}"}}

# ---------------------------------------------------------------------------
# Test 1: Each role can view its own profile
# ---------------------------------------------------------------------------
def test_all_roles_view_profile():
    roles_creds = [
        ("student@clubpulse.edu", "student123", "student"),
        ("organizer@clubpulse.edu", "organizer123", "organizer"),
        ("treasurer@clubpulse.edu", "treasurer123", "treasurer"),
        ("admin@clubpulse.edu", "admin123", "admin"),
    ]

    for email, pwd, expected_role in roles_creds:
        auth = login_user(email, pwd)
        resp = client.get("/api/users/me", headers=auth["headers"])
        assert resp.status_code == 200
        profile = resp.json()
        assert profile["email"] == email
        assert profile["role"] == expected_role
        assert "role_details" in profile
        assert profile["role_details"]["role"] == expected_role

        # Verify role-specific intelligence payload
        if expected_role == "student":
            assert "membership_status" in profile["role_details"]
            assert "registered_events_count" in profile["role_details"]
        elif expected_role == "organizer":
            assert "organization" in profile["role_details"]
            assert "managed_events_count" in profile["role_details"]
        elif expected_role == "treasurer":
            assert "financial_permissions" in profile["role_details"]
            assert "can_manage_budgets" in profile["role_details"]["financial_permissions"]
        elif expected_role == "admin":
            assert "governance_permissions" in profile["role_details"]
            assert "user_management" in profile["role_details"]["governance_permissions"]

# ---------------------------------------------------------------------------
# Test 2: Password hashes & secrets never exposed in responses
# ---------------------------------------------------------------------------
def test_password_hashes_never_exposed():
    auth = login_user("admin@clubpulse.edu", "admin123")
    
    # Check self profile
    profile_resp = client.get("/api/users/me", headers=auth["headers"])
    assert profile_resp.status_code == 200
    profile_data = profile_resp.json()
    assert "hashed_password" not in profile_data
    assert "password" not in profile_data
    assert "salt" not in profile_data

    # Check admin users list
    admin_list_resp = client.get("/api/admin/users", headers=auth["headers"])
    assert admin_list_resp.status_code == 200
    for user_item in admin_list_resp.json()["users"]:
        assert "hashed_password" not in user_item
        assert "password" not in user_item
        assert "salt" not in user_item

# ---------------------------------------------------------------------------
# Test 3: Updating allowed profile fields persists safely
# ---------------------------------------------------------------------------
def test_update_allowed_self_profile_fields():
    auth = login_user("student@clubpulse.edu", "student123")
    update_payload = {
        "full_name": "Aarav Sharma Updated",
        "phone": "+91 9876543210",
        "bio": "Passionate Computer Science student and ClubPulse active member.",
        "department": "Computer Science & Engineering",
        "designation": "Lead Student Ambassador",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
    }

    resp = client.patch("/api/users/me", json=update_payload, headers=auth["headers"])
    assert resp.status_code == 200
    updated_profile = resp.json()
    assert updated_profile["full_name"] == "Aarav Sharma Updated"
    assert updated_profile["phone"] == "+91 9876543210"
    assert updated_profile["bio"] == update_payload["bio"]
    assert updated_profile["department"] == update_payload["department"]
    assert updated_profile["designation"] == update_payload["designation"]

    # Verify persistence by fetching profile again
    get_resp = client.get("/api/users/me", headers=auth["headers"])
    assert get_resp.status_code == 200
    assert get_resp.json()["full_name"] == "Aarav Sharma Updated"

# ---------------------------------------------------------------------------
# Test 4: Reject unauthorized privilege escalation in self update
# ---------------------------------------------------------------------------
def test_prevent_self_privilege_escalation():
    auth = login_user("student@clubpulse.edu", "student123")
    malicious_payload = {
        "full_name": "Sneaky Student",
        "role": "admin",
        "is_active": False,
        "membership_status": "expired",
        "permissions": ["all_access"]
    }

    resp = client.patch("/api/users/me", json=malicious_payload, headers=auth["headers"])
    assert resp.status_code == 200
    profile = resp.json()
    assert profile["role"] == "student"  # Role was NOT escalated
    assert profile["is_active"] is True   # Status was NOT changed
    assert profile["membership_status"] == "active"

# ---------------------------------------------------------------------------
# Test 5: Admin self-update does not cause accidental privilege change
# ---------------------------------------------------------------------------
def test_admin_self_update_without_escalation():
    admin_auth = login_user("admin@clubpulse.edu", "admin123")
    update_payload = {
        "full_name": "Main System Administrator",
        "bio": "Overseeing infrastructure and club operations",
        "role": "student"  # Malicious attempt to change own role via self endpoint
    }

    resp = client.patch("/api/users/me", json=update_payload, headers=admin_auth["headers"])
    assert resp.status_code == 200
    profile = resp.json()
    assert profile["role"] == "admin"  # Strictly preserved
    assert profile["full_name"] == "Main System Administrator"

# ---------------------------------------------------------------------------
# Test 6: Non-admin users denied access to Admin endpoints (HTTP 403)
# ---------------------------------------------------------------------------
def test_non_admin_denied_admin_endpoints():
    non_admins = [
        ("student@clubpulse.edu", "student123"),
        ("organizer@clubpulse.edu", "organizer123"),
        ("treasurer@clubpulse.edu", "treasurer123")
    ]

    for email, pwd in non_admins:
        auth = login_user(email, pwd)
        # Attempt to list all users
        list_resp = client.get("/api/admin/users", headers=auth["headers"])
        assert list_resp.status_code == 403, f"Expected 403 for {email}, got {list_resp.status_code}"

        # Attempt to update a user
        patch_resp = client.patch("/api/admin/users/usr_student01", json={"role": "admin"}, headers=auth["headers"])
        assert patch_resp.status_code == 403

        # Attempt to reset password
        reset_resp = client.post("/api/admin/users/usr_student01/reset-password", json={"new_password": "newpass123", "confirm_password": "newpass123"}, headers=auth["headers"])
        assert reset_resp.status_code == 403

# ---------------------------------------------------------------------------
# Test 7: Admin can list, search, and filter users
# ---------------------------------------------------------------------------
def test_admin_list_and_search_users():
    admin_auth = login_user("admin@clubpulse.edu", "admin123")
    
    # List all
    res = client.get("/api/admin/users", headers=admin_auth["headers"])
    assert res.status_code == 200
    users = res.json()["users"]
    assert len(users) >= 4

    # Filter by role
    treasurer_res = client.get("/api/admin/users?role=treasurer", headers=admin_auth["headers"])
    assert treasurer_res.status_code == 200
    treasurers = treasurer_res.json()["users"]
    assert all(u["role"] == "treasurer" for u in treasurers)
    assert len(treasurers) >= 1

    # Search by text
    search_res = client.get("/api/admin/users?query=organizer@clubpulse.edu", headers=admin_auth["headers"])
    assert search_res.status_code == 200
    matches = search_res.json()["users"]
    assert len(matches) == 1
    assert matches[0]["email"] == "organizer@clubpulse.edu"

# ---------------------------------------------------------------------------
# Test 8: Admin can update another user's profile and membership status
# ---------------------------------------------------------------------------
def test_admin_update_another_user():
    admin_auth = login_user("admin@clubpulse.edu", "admin123")
    update_data = {
        "full_name": "Student Via Admin Edit",
        "phone": "+91 9999988888",
        "department": "Mechanical Engineering",
        "membership_status": "regular"
    }

    res = client.patch("/api/admin/users/usr_student01", json=update_data, headers=admin_auth["headers"])
    assert res.status_code == 200
    updated = res.json()
    assert updated["full_name"] == "Student Via Admin Edit"
    assert updated["department"] == "Mechanical Engineering"
    assert updated["membership_status"] == "regular"

# ---------------------------------------------------------------------------
# Test 9: Last active administrator protection policy
# ---------------------------------------------------------------------------
def test_last_active_administrator_protection():
    admin_auth = login_user("admin@clubpulse.edu", "admin123")
    admin_id = admin_auth["user"]["id"]

    # Temporarily deactivate other admins so admin@clubpulse.edu is the sole active admin
    from app.database.mongodb import get_database
    db = get_database()
    db["users"].update_many(
        {"role": "admin", "id": {"$ne": admin_id}},
        {"$set": {"is_active": False}}
    )

    try:
        # Attempt to demote the sole active admin to student -> must fail with 400
        demote_res = client.patch(f"/api/admin/users/{admin_id}", json={"role": "student"}, headers=admin_auth["headers"])
        assert demote_res.status_code == 400
        assert "administrator" in demote_res.json()["detail"].lower()

        # Attempt to deactivate the sole active admin -> must fail with 400
        deactivate_res = client.patch(f"/api/admin/users/{admin_id}", json={"is_active": False}, headers=admin_auth["headers"])
        assert deactivate_res.status_code == 400
        assert "administrator" in deactivate_res.json()["detail"].lower()
    finally:
        # Restore other admins
        db["users"].update_many(
            {"role": "admin", "id": {"$ne": admin_id}},
            {"$set": {"is_active": True}}
        )

# ---------------------------------------------------------------------------
# Test 10: Change password validation and successful update
# ---------------------------------------------------------------------------
def test_change_password_flow():
    # Login as student
    auth = login_user("student@clubpulse.edu", "student123")

    # 1. Wrong current password
    bad_pass_res = client.post("/api/users/me/change-password", json={
        "current_password": "wrong_password_here",
        "new_password": "student_new_pass1",
        "confirm_password": "student_new_pass1"
    }, headers=auth["headers"])
    assert bad_pass_res.status_code == 400
    assert "incorrect" in bad_pass_res.json()["detail"].lower()

    # 2. Mismatched confirmation password
    mismatch_res = client.post("/api/users/me/change-password", json={
        "current_password": "student123",
        "new_password": "student_new_pass1",
        "confirm_password": "student_different_pass"
    }, headers=auth["headers"])
    assert mismatch_res.status_code == 400
    assert "match" in mismatch_res.json()["detail"].lower()

    # 3. Successful password change
    change_res = client.post("/api/users/me/change-password", json={
        "current_password": "student123",
        "new_password": "student_new_pass1",
        "confirm_password": "student_new_pass1"
    }, headers=auth["headers"])
    assert change_res.status_code == 200

    # 4. Old password must now fail
    old_login = client.post("/api/auth/login", json={"email": "student@clubpulse.edu", "password": "student123"})
    assert old_login.status_code == 401

    # 5. New password succeeds
    new_login = client.post("/api/auth/login", json={"email": "student@clubpulse.edu", "password": "student_new_pass1"})
    assert new_login.status_code == 200

    # 6. Revert password back for other tests idempotency
    new_token = new_login.json()["access_token"]
    revert_res = client.post("/api/users/me/change-password", json={
        "current_password": "student_new_pass1",
        "new_password": "student123",
        "confirm_password": "student123"
    }, headers={"Authorization": f"Bearer {new_token}"})
    assert revert_res.status_code == 200

# ---------------------------------------------------------------------------
# Test 11: Admin reset password for another user
# ---------------------------------------------------------------------------
def test_admin_reset_user_password():
    admin_auth = login_user("admin@clubpulse.edu", "admin123")
    
    # Admin resets student's password
    reset_res = client.post("/api/admin/users/usr_student01/reset-password", json={
        "new_password": "resetpassword123",
        "confirm_password": "resetpassword123"
    }, headers=admin_auth["headers"])
    assert reset_res.status_code == 200

    # Verify student can login with reset password
    student_login = client.post("/api/auth/login", json={
        "email": "student@clubpulse.edu",
        "password": "resetpassword123"
    })
    assert student_login.status_code == 200

    # Revert back to original password
    revert_res = client.post("/api/admin/users/usr_student01/reset-password", json={
        "new_password": "student123",
        "confirm_password": "student123"
    }, headers=admin_auth["headers"])
    assert revert_res.status_code == 200

# ---------------------------------------------------------------------------
# Test 12: Account settings preferences persistence
# ---------------------------------------------------------------------------
def test_account_settings_preferences_persistence():
    auth = login_user("organizer@clubpulse.edu", "organizer123")

    update_payload = {
        "preferences": {
            "notification_email_alerts": False,
            "notification_event_reminders": True,
            "profile_visibility": "club_members"
        }
    }

    resp = client.patch("/api/users/me", json=update_payload, headers=auth["headers"])
    assert resp.status_code == 200
    user_data = resp.json()
    assert user_data.get("preferences") is not None
    assert user_data["preferences"]["notification_email_alerts"] is False
    assert user_data["preferences"]["profile_visibility"] == "club_members"

    # Confirm persistence
    get_resp = client.get("/api/users/me", headers=auth["headers"])
    assert get_resp.status_code == 200
    assert get_resp.json()["preferences"]["notification_email_alerts"] is False
