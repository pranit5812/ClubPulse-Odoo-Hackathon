from typing import Optional
from pydantic import BaseModel, EmailStr

class MemberCreate(BaseModel):
    full_name: str
    email: EmailStr
    roll_number: str
    phone: Optional[str] = None
    department: Optional[str] = "Computer Science"
    membership_type: str = "annual"  # annual, semester
    dues_paid_paise: int = 50000  # ₹500 in paise

class MemberUpdate(BaseModel):
    status: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None

class MemberRenew(BaseModel):
    duration_months: int = 12
    payment_reference: Optional[str] = "ONLINE-TXN"

class MemberResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    full_name: str
    email: str
    roll_number: str
    phone: Optional[str] = None
    department: Optional[str] = None
    status: str  # active, expired, pending, suspended
    membership_type: str
    start_date: str
    expiry_date: str
    dues_paid_paise: int
    created_at: str
