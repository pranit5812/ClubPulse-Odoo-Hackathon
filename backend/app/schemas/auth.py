from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    roll_number: Optional[str] = "STU-001"
    phone: Optional[str] = None
    role: Optional[str] = "student"  # student, organizer, treasurer, admin

class SendOtpRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = "Student"

class VerifyOtpAndRegisterRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    roll_number: Optional[str] = "STU-001"
    phone: Optional[str] = None

class SendLoginOtpRequest(BaseModel):
    email: EmailStr

class VerifyLoginOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    roll_number: Optional[str] = None
    phone: Optional[str] = None
    role: str
    membership_status: str = "non_member"  # non_member, active, expired, pending
    membership_expiry: Optional[str] = None
    membership_tier: Optional[str] = "annual"
    membership_role: Optional[str] = "participant"  # participant, volunteer
    is_volunteer: Optional[bool] = False
    volunteer_events: Optional[list] = []
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
