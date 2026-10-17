from typing import Optional, List
from pydantic import BaseModel, Field

class TicketBookRequest(BaseModel):
    event_id: str
    quantity: int = Field(default=1, ge=1, le=10)
    attendee_names: Optional[List[str]] = None
    role_track: Optional[str] = "participant"
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None

class TicketResponse(BaseModel):
    id: str
    event_id: str
    event_title: str
    event_date: str
    venue: str
    user_id: str
    user_name: str
    user_email: str
    quantity: int
    total_amount_paise: int
    is_member_discount_applied: bool
    role_track: Optional[str] = "participant"
    qr_token: str
    qr_image: Optional[str] = None  # base64 data URL of QR code PNG stored in DB
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    user_roll_number: Optional[str] = None
    user_department: Optional[str] = None
    user_phone: Optional[str] = None
    membership_status: Optional[str] = None
    checked_in: bool
    checked_in_at: Optional[str] = None
    created_at: str


class TicketCheckInRequest(BaseModel):
    qr_token: str

class TicketCheckInResponse(BaseModel):
    success: bool
    message: str
    ticket_id: Optional[str] = None
    attendee_name: Optional[str] = None
    attendee_roll_number: Optional[str] = None
    attendee_department: Optional[str] = None
    attendee_email: Optional[str] = None
    event_title: Optional[str] = None
    checked_in_at: Optional[str] = None
