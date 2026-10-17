from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from app.database.mongodb import get_database
from app.core.security import hash_password, verify_password
from app.schemas.user import (
    UserProfileResponse,
    UserProfileUpdate,
    ChangePasswordRequest,
    AdminUserUpdate,
    AdminUserListResponse
)
from app.services.audit_service import record_audit_log

class UserService:
    @staticmethod
    def _compute_role_details(user: dict, db) -> Dict[str, Any]:
        """
        Dynamically calculates role-specific metadata without exposing sensitive secrets.
        """
        user_id = user.get("id")
        user_email = user.get("email")
        role = user.get("role", "student")
        role_details: Dict[str, Any] = {}

        if role == "student":
            # Count registered tickets
            ticket_count = db["tickets"].count_documents({
                "$or": [
                    {"user_id": user_id},
                    {"user_email": user_email}
                ]
            })
            # Count assigned tasks (for volunteers)
            task_count = db["tasks"].count_documents({
                "$or": [
                    {"assignee_id": user_id},
                    {"assignee_email": user_email}
                ]
            })
            role_details = {
                "role": "student",
                "roll_number": user.get("roll_number") or "STU-2026-001",
                "department": user.get("department") or "Computer Science & Engineering",
                "events_registered_count": ticket_count,
                "registered_events_count": ticket_count,
                "volunteer_tasks_count": task_count,
                "membership_tier": user.get("membership_tier"),
                "membership_role": user.get("membership_role", "participant"),
                "membership_status": user.get("membership_status") or "non_member",
                "membership_expiry": user.get("membership_expiry"),
                "membership_renewal_date": user.get("membership_expiry")
            }

        elif role == "organizer":
            total_events = db["events"].count_documents({})
            role_details = {
                "role": "organizer",
                "organization": "ClubPulse Student Council",
                "designation": user.get("designation") or "Lead Event Director",
                "department": user.get("department") or "Campus Operations & Activities",
                "total_managed_events": total_events,
                "managed_events_count": total_events,
                "assigned_responsibilities": [
                    "Event Creation & Lifecycle Control",
                    "Attendee Capacity & Ticket Tier Management",
                    "Volunteer Task Assignment & Rosters",
                    "Official Campus Announcements"
                ]
            }

        elif role == "treasurer":
            role_details = {
                "role": "treasurer",
                "organization": "ClubPulse Executive Treasury",
                "designation": user.get("designation") or "Executive Treasurer",
                "department": user.get("department") or "Finance & Resource Allocation",
                "financial_permissions": {
                    "can_manage_budgets": True,
                    "can_reconcile_ledger": True,
                    "can_simulate_scenarios": True,
                    "can_approve_expenses": True
                },
                "security_clearance": "Treasury Level 2 (Non-Sensitive Public Accounting)"
            }

        elif role == "admin":
            total_users = db["users"].count_documents({})
            total_audit_logs = db["audit_logs"].count_documents({})
            role_details = {
                "role": "admin",
                "designation": user.get("designation") or "Principal System Administrator",
                "department": user.get("department") or "Executive Council & IT Administration",
                "governance_permissions": {
                    "user_management": True,
                    "role_assignment": True,
                    "audit_oversight": True,
                    "system_health": True
                },
                "assigned_permissions": [
                    "Global User Management & Governance",
                    "Role Assignment & Security Policy Enforcement",
                    "Audit Trail Oversight",
                    "System Health & Service Integration"
                ],
                "system_metrics": {
                    "total_registered_accounts": total_users,
                    "total_audit_events": total_audit_logs
                },
                "security_info": {
                    "mfa_supported": True,
                    "session_policy": "Bearer JWT (1-Year Development Lifespan)",
                    "last_security_review": user.get("created_at")
                }
            }

        return role_details

    @staticmethod
    def build_profile_response(user: dict, db=None) -> UserProfileResponse:
        if db is None:
            db = get_database()

        clean_user = {k: v for k, v in user.items() if k not in ["_id", "hashed_password"]}
        role_details = UserService._compute_role_details(user, db)

        return UserProfileResponse(
            id=clean_user["id"],
            email=clean_user["email"],
            full_name=clean_user.get("full_name", "Club Member"),
            roll_number=clean_user.get("roll_number"),
            phone=clean_user.get("phone"),
            bio=clean_user.get("bio") or (
                "Passionate student and active member of the ClubPulse campus community."
                if clean_user.get("role") == "student" else
                f"Dedicated {clean_user.get('role', 'staff').capitalize()} driving student engagement and operational excellence."
            ),
            avatar_url=clean_user.get("avatar_url"),
            department=clean_user.get("department") or ("Computer Science" if clean_user.get("role") == "student" else "Operations & Council"),
            designation=clean_user.get("designation") or (f"Club {clean_user.get('role', 'Member').capitalize()}"),
            role=clean_user.get("role", "student"),
            membership_status=clean_user.get("membership_status") or "non_member",
            membership_expiry=clean_user.get("membership_expiry"),
            membership_tier=clean_user.get("membership_tier"),
            membership_role=clean_user.get("membership_role", "participant"),
            is_volunteer=bool(clean_user.get("is_volunteer", False) or clean_user.get("membership_role") == "volunteer"),
            is_active=clean_user.get("is_active", True),
            created_at=clean_user.get("created_at", datetime.now(timezone.utc).isoformat()),
            password_last_changed=clean_user.get("password_last_changed"),
            notification_preferences=clean_user.get("notification_preferences", {
                "email_alerts": True,
                "event_reminders": True,
                "announcements": True,
                "treasury_updates": True
            }),
            preferences=clean_user.get("preferences") or clean_user.get("notification_preferences", {
                "notification_email_alerts": True,
                "notification_event_reminders": True,
                "profile_visibility": "club_members"
            }),
            profile_visibility=clean_user.get("profile_visibility", "club_members"),
            role_details=role_details
        )

    @staticmethod
    def get_current_profile(user_id: str) -> UserProfileResponse:
        db = get_database()
        user = db["users"].find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")
        return UserService.build_profile_response(user, db)

    @staticmethod
    def update_self_profile(user_id: str, data: UserProfileUpdate) -> UserProfileResponse:
        db = get_database()
        user = db["users"].find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

        update_dict = {}
        if data.full_name is not None and data.full_name.strip():
            update_dict["full_name"] = data.full_name.strip()
        if data.phone is not None:
            update_dict["phone"] = data.phone.strip()
        if data.bio is not None:
            update_dict["bio"] = data.bio.strip()
        if data.avatar_url is not None:
            update_dict["avatar_url"] = data.avatar_url
        if data.department is not None:
            update_dict["department"] = data.department.strip()
        if data.designation is not None:
            update_dict["designation"] = data.designation.strip()
        if data.notification_preferences is not None:
            update_dict["notification_preferences"] = data.notification_preferences
        if data.preferences is not None:
            update_dict["preferences"] = data.preferences
        if data.profile_visibility is not None:
            update_dict["profile_visibility"] = data.profile_visibility

        if update_dict:
            db["users"].update_one({"id": user_id}, {"$set": update_dict})

        updated_user = db["users"].find_one({"id": user_id})
        return UserService.build_profile_response(updated_user, db)

    @staticmethod
    def change_password(user_id: str, data: ChangePasswordRequest) -> dict:
        if data.new_password != data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password and confirm password do not match."
            )

        if len(data.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters long."
            )

        db = get_database()
        user = db["users"].find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

        current_hashed = user.get("hashed_password")
        if not current_hashed or not verify_password(data.current_password, current_hashed):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password. Verification failed. Please check your current password."
            )

        if verify_password(data.new_password, current_hashed):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from your current password."
            )

        new_hash = hash_password(data.new_password)
        now_iso = datetime.now(timezone.utc).isoformat()

        db["users"].update_one(
            {"id": user_id},
            {"$set": {
                "hashed_password": new_hash,
                "password_last_changed": now_iso
            }}
        )

        record_audit_log(
            user_email=user["email"],
            user_role=user.get("role", "student"),
            action="USER_CHANGE_PASSWORD",
            entity_type="user",
            entity_id=user["id"],
            summary="User successfully changed their account password."
        )

        return {
            "success": True,
            "message": "Password changed successfully."
        }

    @staticmethod
    def admin_list_users(
        search: Optional[str] = None,
        role: Optional[str] = None,
        status_filter: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> AdminUserListResponse:
        db = get_database()
        query: Dict[str, Any] = {}

        if search and search.strip():
            s = search.strip()
            query["$or"] = [
                {"full_name": {"$regex": s, "$options": "i"}},
                {"email": {"$regex": s, "$options": "i"}},
                {"roll_number": {"$regex": s, "$options": "i"}},
                {"phone": {"$regex": s, "$options": "i"}},
                {"department": {"$regex": s, "$options": "i"}}
            ]

        if role and role != "all":
            query["role"] = role

        if status_filter and status_filter != "all":
            if status_filter == "deactivated":
                query["is_active"] = False
            elif status_filter == "active":
                query["$or"] = [
                    {"membership_status": "active"},
                    {"is_active": True}
                ]
            else:
                query["membership_status"] = status_filter

        total = db["users"].count_documents(query)
        cursor = db["users"].find(query).sort("created_at", -1).skip(skip).limit(limit)

        users_list = []
        for doc in cursor:
            users_list.append(UserService.build_profile_response(doc, db))

        return AdminUserListResponse(total=total, users=users_list)

    @staticmethod
    def admin_get_user(target_user_id: str) -> UserProfileResponse:
        db = get_database()
        user = db["users"].find_one({"id": target_user_id})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")
        return UserService.build_profile_response(user, db)

    @staticmethod
    def admin_update_user(
        target_user_id: str,
        data: AdminUserUpdate,
        admin_user: dict
    ) -> UserProfileResponse:
        db = get_database()
        target_user = db["users"].find_one({"id": target_user_id})
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user account not found.")

        # --- LAST ACTIVE ADMINISTRATOR PROTECTION ---
        is_target_admin = target_user.get("role") == "admin"
        demoting_role = data.role is not None and data.role != "admin"
        deactivating_admin = data.is_active is False

        if is_target_admin and (demoting_role or deactivating_admin):
            # Count how many active admins exist
            active_admins = db["users"].count_documents({
                "role": "admin",
                "is_active": {"$ne": False}
            })
            if active_admins <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Security policy violation: Cannot demote or deactivate the last remaining active administrator."
                )

        update_dict = {}
        if data.full_name is not None and data.full_name.strip():
            update_dict["full_name"] = data.full_name.strip()
        if data.phone is not None:
            update_dict["phone"] = data.phone.strip()
        if data.bio is not None:
            update_dict["bio"] = data.bio.strip()
        if data.department is not None:
            update_dict["department"] = data.department.strip()
        if data.designation is not None:
            update_dict["designation"] = data.designation.strip()
        if data.roll_number is not None:
            update_dict["roll_number"] = data.roll_number.strip()
        if data.membership_status is not None:
            update_dict["membership_status"] = data.membership_status
        if data.role is not None:
            if data.role not in ["student", "organizer", "treasurer", "admin"]:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role '{data.role}'")
            update_dict["role"] = data.role
        if data.is_active is not None:
            update_dict["is_active"] = data.is_active

        if update_dict:
            db["users"].update_one({"id": target_user_id}, {"$set": update_dict})

            record_audit_log(
                user_email=admin_user["email"],
                user_role=admin_user.get("role", "admin"),
                action="ADMIN_UPDATE_USER",
                entity_type="user",
                entity_id=target_user_id,
                summary=f"Admin {admin_user['email']} updated profile/role for user {target_user['email']}.",
                payload={"updated_fields": list(update_dict.keys())}
            )

        updated_user = db["users"].find_one({"id": target_user_id})
        return UserService.build_profile_response(updated_user, db)

    @staticmethod
    def admin_reset_password(
        target_user_id: str,
        new_password: str,
        admin_user: dict
    ) -> dict:
        if len(new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters long."
            )

        db = get_database()
        target_user = db["users"].find_one({"id": target_user_id})
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user account not found.")

        new_hash = hash_password(new_password)
        now_iso = datetime.now(timezone.utc).isoformat()

        db["users"].update_one(
            {"id": target_user_id},
            {"$set": {
                "hashed_password": new_hash,
                "password_last_changed": now_iso
            }}
        )

        record_audit_log(
            user_email=admin_user["email"],
            user_role=admin_user.get("role", "admin"),
            action="ADMIN_RESET_PASSWORD",
            entity_type="user",
            entity_id=target_user_id,
            summary=f"Admin {admin_user['email']} reset password for user {target_user['email']}."
        )

        return {
            "success": True,
            "message": f"Password reset successfully for {target_user['email']}."
        }
