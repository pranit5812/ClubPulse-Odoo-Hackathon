from fastapi import APIRouter, Depends
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserResponse,
    SendOtpRequest,
    VerifyOtpAndRegisterRequest,
    SendLoginOtpRequest,
    VerifyLoginOtpRequest
)
from app.services.auth_service import AuthService
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/send-otp")
def send_otp(data: SendOtpRequest):
    return AuthService.send_registration_otp(data)

@router.post("/verify-otp-and-register", response_model=TokenResponse)
def verify_otp_and_register(data: VerifyOtpAndRegisterRequest):
    return AuthService.verify_otp_and_register(data)

@router.post("/send-login-otp")
def send_login_otp(data: SendLoginOtpRequest):
    return AuthService.send_login_otp(data)

@router.post("/verify-login-otp", response_model=TokenResponse)
def verify_login_otp(data: VerifyLoginOtpRequest):
    return AuthService.verify_login_otp(data)

@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister):
    return AuthService.register(data)

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin):
    return AuthService.login(data)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        roll_number=current_user.get("roll_number"),
        phone=current_user.get("phone"),
        role=current_user.get("role", "student"),
        membership_status=current_user.get("membership_status", "non_member"),
        membership_expiry=current_user.get("membership_expiry"),
        membership_tier=current_user.get("membership_tier"),
        membership_role=current_user.get("membership_role", "participant"),
        is_volunteer=bool(current_user.get("is_volunteer", False) or current_user.get("membership_role") == "volunteer"),
        volunteer_events=current_user.get("volunteer_events", []),
        created_at=current_user.get("created_at", "")
    )

