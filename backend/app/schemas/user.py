from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    roll_number: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    role: str
    membership_status: str = "non_member"
    membership_expiry: Optional[str] = None
    membership_tier: Optional[str] = "annual"
    membership_role: Optional[str] = "participant"
    is_volunteer: Optional[bool] = False
    is_active: bool = True
    created_at: str
    password_last_changed: Optional[str] = None
    notification_preferences: Optional[Dict[str, bool]] = {
        "email_alerts": True,
        "event_reminders": True,
        "announcements": True,
        "treasury_updates": True
    }
    preferences: Optional[Dict[str, Any]] = None
    profile_visibility: Optional[str] = "club_members"  # club_members, public, private
    role_details: Optional[Dict[str, Any]] = {}

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=25)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    department: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    notification_preferences: Optional[Dict[str, bool]] = None
    preferences: Optional[Dict[str, Any]] = None
    profile_visibility: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6, max_length=100)
    confirm_password: str = Field(..., min_length=6, max_length=100)

class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = None
    bio: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    roll_number: Optional[str] = None
    membership_status: Optional[str] = None
    role: Optional[str] = None  # student, organizer, treasurer, admin
    is_active: Optional[bool] = None

class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=100)

class AdminUserListResponse(BaseModel):
    total: int
    users: List[UserProfileResponse]
