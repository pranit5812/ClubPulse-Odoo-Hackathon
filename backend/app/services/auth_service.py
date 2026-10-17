import secrets
import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from app.database.mongodb import get_database
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    SendOtpRequest,
    VerifyOtpAndRegisterRequest,
    SendLoginOtpRequest,
    VerifyLoginOtpRequest
)
from app.services.email_service import EmailService

FIXED_STAFF_ACCOUNTS = {
    "harshparmar1617@gmail.com": {
        "full_name": "Harsh Parmar",
        "role": "admin",
        "roll_number": "ADM-001",
        "phone": "+91 98765 43210"
    },
    "pranitpawar3004@gmail.com": {
        "full_name": "Pranit Pawar",
        "role": "organizer",
        "roll_number": "ORG-003",
        "phone": "+91 98765 43212"
    },
    "yugr362@gmail.com": {
        "full_name": "Yug",
        "role": "treasurer",
        "roll_number": "TRS-002",
        "phone": "+91 98765 43211"
    }
}
FIXED_STAFF_PASSWORD = "123456"

class AuthService:
    @staticmethod
    def ensure_fixed_staff_users(db=None):
        """
        Guarantees that the 3 fixed staff accounts (admin, organizer, treasurer)
        are present in the database with password 123456.
        """
        if db is None:
            db = get_database()

        now_iso = datetime.utcnow().isoformat()
        future_iso = (datetime.utcnow() + timedelta(days=365)).isoformat()

        for email, info in FIXED_STAFF_ACCOUNTS.items():
            existing = db["users"].find_one({"email": email})
            hashed_pwd = hash_password(FIXED_STAFF_PASSWORD)

            if not existing:
                db["users"].insert_one({
                    "id": f"usr_{info['role']}_{uuid.uuid4().hex[:6]}",
                    "email": email,
                    "hashed_password": hashed_pwd,
                    "full_name": info["full_name"],
                    "roll_number": info["roll_number"],
                    "phone": info["phone"],
                    "role": info["role"],
                    "membership_status": "active",
                    "membership_expiry": future_iso,
                    "membership_tier": "annual",
                    "membership_role": "volunteer" if info["role"] == "organizer" else "participant",
                    "created_at": now_iso
                })
            else:
                db["users"].update_one(
                    {"email": email},
                    {"$set": {
                        "hashed_password": hashed_pwd,
                        "role": info["role"],
                        "full_name": info["full_name"],
                        "membership_status": "active"
                    }}
                )

    @staticmethod
    def send_registration_otp(data: SendOtpRequest):
        db = get_database()
        AuthService.ensure_fixed_staff_users(db)

        email_clean = data.email.strip().lower()

        # Check if email is a fixed staff email
        if email_clean in FIXED_STAFF_ACCOUNTS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This email address is reserved for official club {FIXED_STAFF_ACCOUNTS[email_clean]['role'].capitalize()}. Please log in directly."
            )

        # Check if email is already registered
        existing = db["users"].find_one({"email": email_clean})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists. Please sign in."
            )

        # Generate 6-digit OTP code
        otp_code = f"{secrets.randbelow(900000) + 100000:06d}"
        expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
        now_iso = datetime.utcnow().isoformat()

        db["email_otps"].update_one(
            {"email": email_clean},
            {"$set": {
                "email": email_clean,
                "otp": otp_code,
                "expires_at": expires_at,
                "created_at": now_iso
            }},
            upsert=True
        )

        sent = EmailService.send_otp_email(email_clean, otp_code, data.full_name or "Student")
        return {
            "success": True,
            "message": f"Verification code sent to {data.email}."
        }

    @staticmethod
    def verify_otp_and_register(data: VerifyOtpAndRegisterRequest) -> TokenResponse:
        db = get_database()
        AuthService.ensure_fixed_staff_users(db)

        email_clean = data.email.strip().lower()

        if email_clean in FIXED_STAFF_ACCOUNTS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email address is reserved for official leadership."
            )

        existing = db["users"].find_one({"email": email_clean})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists."
            )

        # Look up OTP in collection
        otp_record = db["email_otps"].find_one({"email": email_clean})
        if not otp_record or otp_record.get("otp") != data.otp.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code. Please check your email or request a new code."
            )

        # Check expiration
        try:
            expires_at = datetime.fromisoformat(otp_record["expires_at"])
            if expires_at < datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification code has expired. Please request a new code."
                )
        except (ValueError, KeyError):
            pass

        # OTP is valid -> delete OTP record to prevent reuse
        db["email_otps"].delete_one({"email": email_clean})

        user_id = f"usr_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.utcnow().isoformat()
        future_iso = (datetime.utcnow() + timedelta(days=365)).isoformat()

        user_doc = {
            "id": user_id,
            "email": email_clean,
            "hashed_password": hash_password(data.password),
            "full_name": data.full_name.strip(),
            "roll_number": data.roll_number or "STU-001",
            "phone": data.phone,
            "department": "Computer Science",
            "role": "student",
            "membership_status": "non_member",
            "membership_expiry": None,
            "membership_tier": None,
            "membership_role": "participant",
            "is_active": True,
            "created_at": now_iso
        }

        db["users"].insert_one(user_doc)

        token = create_access_token({"sub": user_id, "role": "student"})

        user_res = UserResponse(
            id=user_doc["id"],
            email=user_doc["email"],
            full_name=user_doc["full_name"],
            roll_number=user_doc["roll_number"],
            phone=user_doc["phone"],
            role="student",
            membership_status=user_doc["membership_status"],
            membership_expiry=user_doc["membership_expiry"],
            membership_tier=user_doc.get("membership_tier"),
            membership_role=user_doc.get("membership_role", "participant"),
            created_at=user_doc["created_at"]
        )
        return TokenResponse(access_token=token, user=user_res)

    @staticmethod
    def send_login_otp(data: SendLoginOtpRequest) -> dict:
        db = get_database()
        AuthService.ensure_fixed_staff_users(db)

        email_clean = data.email.strip().lower()

        # Generate 6-digit OTP code
        otp_code = f"{secrets.randbelow(900000) + 100000:06d}"
        expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
        now_iso = datetime.utcnow().isoformat()

        db["email_otps"].update_one(
            {"email": email_clean},
            {"$set": {
                "email": email_clean,
                "otp": otp_code,
                "expires_at": expires_at,
                "created_at": now_iso
            }},
            upsert=True
        )

        existing_user = db["users"].find_one({"email": email_clean})
        user_name = existing_user.get("full_name") if existing_user else "Student"

        EmailService.send_otp_email(email_clean, otp_code, user_name)

        return {
            "success": True,
            "message": f"Verification code sent to {email_clean}."
        }

    @staticmethod
    def verify_login_otp(data: VerifyLoginOtpRequest) -> TokenResponse:
        db = get_database()
        AuthService.ensure_fixed_staff_users(db)

        email_clean = data.email.strip().lower()

        # Look up OTP in collection
        otp_record = db["email_otps"].find_one({"email": email_clean})
        if not otp_record or otp_record.get("otp") != data.otp.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code. Please check your email or request a new code."
            )

        # Check expiration
        expires_at = otp_record.get("expires_at")
        if expires_at and datetime.fromisoformat(expires_at) < datetime.utcnow():
            db["email_otps"].delete_one({"email": email_clean})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new code."
            )

        # Remove used OTP
        db["email_otps"].delete_one({"email": email_clean})

        user = db["users"].find_one({"email": email_clean})
        if not user:
            # If not yet registered, auto-register as student!
            name_part = email_clean.split("@")[0].replace(".", " ").replace("_", " ").title()
            user_id = f"usr_{uuid.uuid4().hex[:10]}"
            now_iso = datetime.utcnow().isoformat()
            user = {
                "id": user_id,
                "email": email_clean,
                "hashed_password": hash_password(secrets.token_hex(8)),
                "full_name": name_part or "Student",
                "roll_number": f"STU-{secrets.randbelow(9000)+1000}",
                "phone": None,
                "role": "student",
                "membership_status": "non_member",
                "membership_expiry": None,
                "membership_tier": "annual",
                "membership_role": "participant",
                "created_at": now_iso
            }
            db["users"].insert_one(user)

        role = user.get("role", "student")
        access_token = create_access_token({"sub": user["id"], "role": role})

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user["id"],
                email=user["email"],
                full_name=user.get("full_name", "Student"),
                roll_number=user.get("roll_number"),
                phone=user.get("phone"),
                role=role,
                membership_status=user.get("membership_status", "non_member"),
                membership_expiry=user.get("membership_expiry"),
                membership_tier=user.get("membership_tier", "annual"),
                membership_role=user.get("membership_role", "participant"),
                created_at=user.get("created_at", datetime.utcnow().isoformat())
            )
        )

    @staticmethod
    def register(data: UserRegister) -> TokenResponse:
        db = get_database()
        AuthService.ensure_fixed_staff_users(db)

        email_clean = data.email.lower().strip()
        existing = db["users"].find_one({"email": email_clean})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists."
            )

        user_id = f"usr_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.utcnow().isoformat()
        future_iso = (datetime.utcnow() + timedelta(days=365)).isoformat()

        # Public registrations are strictly student role
        role = "student"

        user_doc = {
            "id": user_id,
            "email": email_clean,
            "hashed_password": hash_password(data.password),
            "full_name": data.full_name.strip(),
            "roll_number": data.roll_number or "STU-001",
            "phone": data.phone,
            "department": "Computer Science",
            "role": role,
            "membership_status": "non_member",
            "membership_expiry": None,
            "membership_tier": None,
            "membership_role": "participant",
            "is_active": True,
            "created_at": now_iso
        }

        db["users"].insert_one(user_doc)

        token = create_access_token({"sub": user_id, "role": role})

        user_res = UserResponse(
            id=user_doc["id"],
            email=user_doc["email"],
            full_name=user_doc["full_name"],
            roll_number=user_doc["roll_number"],
            phone=user_doc["phone"],
            role=role,
            membership_status=user_doc["membership_status"],
            membership_expiry=user_doc["membership_expiry"],
            membership_tier=user_doc.get("membership_tier"),
            membership_role=user_doc.get("membership_role", "participant"),
            created_at=user_doc["created_at"]
        )
        return TokenResponse(access_token=token, user=user_res)

    @staticmethod
    def login(data: UserLogin) -> TokenResponse:
        db = get_database()
        AuthService.ensure_fixed_staff_users(db)

        email_clean = data.email.lower().strip()
        user_doc = db["users"].find_one({"email": email_clean})

        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        # Check password
        is_fixed = email_clean in FIXED_STAFF_ACCOUNTS
        is_valid_pwd = verify_password(data.password, user_doc.get("hashed_password", ""))

        if is_fixed and data.password == FIXED_STAFF_PASSWORD:
            is_valid_pwd = True

        if not is_valid_pwd:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        token = create_access_token({"sub": user_doc["id"], "role": user_doc.get("role", "student")})

        user_res = UserResponse(
            id=user_doc["id"],
            email=user_doc["email"],
            full_name=user_doc["full_name"],
            roll_number=user_doc.get("roll_number"),
            phone=user_doc.get("phone"),
            role=user_doc.get("role", "student"),
            membership_status=user_doc.get("membership_status", "non_member"),
            membership_expiry=user_doc.get("membership_expiry"),
            membership_tier=user_doc.get("membership_tier", "annual"),
            membership_role=user_doc.get("membership_role", "participant"),
            created_at=user_doc.get("created_at", datetime.utcnow().isoformat())
        )
        return TokenResponse(access_token=token, user=user_res)
