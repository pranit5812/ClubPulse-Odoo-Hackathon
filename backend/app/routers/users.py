from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from app.core.dependencies import get_current_user, require_roles
from app.schemas.user import (
    UserProfileResponse,
    UserProfileUpdate,
    ChangePasswordRequest,
    AdminUserUpdate,
    AdminResetPasswordRequest,
    AdminUserListResponse
)
from app.services.user_service import UserService

router = APIRouter(tags=["User Profiles & Administration"])

# ============================================================================
# 1. AUTHENTICATED USER SELF-PROFILE ENDPOINTS
# ============================================================================

@router.get("/api/users/me", response_model=UserProfileResponse)
def get_my_profile(current_user: dict = Depends(get_current_user)):
    """
    Fetch the authenticated user's complete profile, including role-specific intelligence.
    """
    return UserService.get_current_profile(current_user["id"])

@router.patch("/api/users/me", response_model=UserProfileResponse)
def update_my_profile(
    data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update permitted fields in the authenticated user's own profile.
    Prevents self-escalation of roles, account status, or permissions.
    """
    return UserService.update_self_profile(current_user["id"], data)

@router.post("/api/users/me/change-password")
def change_my_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Securely change password with verification of current password and bcrypt re-hashing.
    """
    return UserService.change_password(current_user["id"], data)


# ============================================================================
# 2. ADMIN USER GOVERNANCE ENDPOINTS
# ============================================================================

@router.get("/api/admin/users", response_model=AdminUserListResponse)
def admin_list_users(
    search: Optional[str] = Query(None, description="Search by name, email, roll number, or phone"),
    query: Optional[str] = Query(None, description="Search query alias"),
    role: Optional[str] = Query(None, description="Filter by role: student, organizer, treasurer, admin"),
    status: Optional[str] = Query(None, description="Filter by status: active, expired, non_member, deactivated"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    current_admin: dict = Depends(require_roles(["admin"]))
):
    """
    List registered users for authorized administrators with search and filtering.
    """
    search_term = search or query
    return UserService.admin_list_users(
        search=search_term,
        role=role,
        status_filter=status,
        limit=limit,
        skip=skip
    )

@router.get("/api/admin/users/{user_id}", response_model=UserProfileResponse)
def admin_get_user(
    user_id: str,
    current_admin: dict = Depends(require_roles(["admin"]))
):
    """
    Retrieve an individual user's complete profile for administrative inspection.
    """
    return UserService.admin_get_user(user_id)

@router.patch("/api/admin/users/{user_id}", response_model=UserProfileResponse)
def admin_update_user(
    user_id: str,
    data: AdminUserUpdate,
    current_admin: dict = Depends(require_roles(["admin"]))
):
    """
    Administratively update user profile, membership status, or role.
    Enforces security policy protecting the last active administrator from demotion or deactivation.
    """
    return UserService.admin_update_user(user_id, data, current_admin)

@router.post("/api/admin/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: str,
    data: AdminResetPasswordRequest,
    current_admin: dict = Depends(require_roles(["admin"]))
):
    """
    Administratively reset a user's password with audit trail logging.
    """
    return UserService.admin_reset_password(user_id, data.new_password, current_admin)
