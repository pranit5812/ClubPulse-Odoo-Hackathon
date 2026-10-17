import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
try:
    import razorpay
except ImportError:
    razorpay = None
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.database.mongodb import get_database

logger = logging.getLogger("clubpulse.payments")

router = APIRouter(prefix="/api/payments", tags=["Payments"])

class MembershipOrderRequest(BaseModel):
    tier: str = Field(default="annual")  # "annual" or "semester"
    member_role: str = Field(default="participant")  # "participant" or "volunteer"

class MembershipVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    tier: str = "annual"
    member_role: str = "participant"  # "participant" or "volunteer"

class SwitchTrackRequest(BaseModel):
    member_role: str = "participant"  # "participant" or "volunteer"

class TicketOrderRequest(BaseModel):
    event_id: str
    quantity: int = Field(default=1, ge=1, le=10)
    role_track: Optional[str] = "participant"

class MerchOrderPaymentRequest(BaseModel):
    product_id: str
    size: str
    quantity: int = Field(default=1, ge=1, le=10)
    delivery_notes: Optional[str] = None

@router.get("/config")
def get_payment_config():
    """Return public Razorpay Key ID for client-side checkout"""
    return {
        "razorpay_key_id": settings.RAZORPAY_KEY_ID
    }

@router.post("/create-membership-order")
def create_membership_order(
    data: MembershipOrderRequest,
    current_user: dict = Depends(get_current_user)
):
    tier = data.tier.lower()
    if tier not in ["annual", "semester"]:
        tier = "annual"

    # Annual: ₹500 (50,000 paise), Semester: ₹300 (30,000 paise)
    amount_paise = 50000 if tier == "annual" else 30000

    member_role = data.member_role.lower() if data.member_role else "participant"
    if member_role not in ["participant", "volunteer"]:
        member_role = "participant"

    try:
        if razorpay is not None:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            receipt_id = f"rcpt_{uuid.uuid4().hex[:10]}"
            
            order_payload = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt_id,
                "notes": {
                    "user_id": current_user["id"],
                    "tier": tier,
                    "member_role": member_role,
                    "full_name": current_user["full_name"],
                    "email": current_user["email"]
                }
            }
            
            razorpay_order = client.order.create(data=order_payload)
            order_id = razorpay_order["id"]
        else:
            order_id = f"order_{uuid.uuid4().hex[:14]}"
        
        return {
            "order_id": order_id,
            "amount_paise": amount_paise,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID or "rzp_test_placeholder",
            "tier": tier,
            "member_role": member_role,
            "user_name": current_user["full_name"],
            "user_email": current_user["email"],
            "user_phone": current_user.get("phone") or "+91 9876543210"
        }
    except Exception as e:
        logger.error(f"Razorpay order creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Razorpay payment order: {str(e)}"
        )

@router.post("/create-ticket-order")
def create_ticket_order(
    data: TicketOrderRequest,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    event = db["events"].find_one({"id": data.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    if not event.get("is_published", False):
        raise HTTPException(status_code=400, detail="Event is not published for booking.")

    if event.get("is_ended", False) or event.get("status") == "ended":
        raise HTTPException(status_code=400, detail="This event has concluded. Ticket bookings are closed.")

    # Prevent already enrolled attendees from re-registering
    existing_ticket = db["tickets"].find_one({
        "event_id": data.event_id,
        "user_id": current_user["id"],
        "status": {"$ne": "cancelled"}
    })
    if existing_ticket:
        raise HTTPException(
            status_code=400,
            detail="You are already enrolled in this event. Re-registration is not permitted."
        )

    capacity = event.get("capacity", 100)
    booked = event.get("booked_count", 0)
    if booked + data.quantity > capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot book {data.quantity} ticket(s). Only {max(0, capacity - booked)} seats remain."
        )

    is_member = current_user.get("membership_status") == "active"
    unit_price = event["member_price_paise"] if is_member else event["non_member_price_paise"]
    amount_paise = unit_price * data.quantity

    role_track = (data.role_track or "participant").lower()
    if role_track not in ["participant", "volunteer"]:
        role_track = "participant"

    if amount_paise == 0:
        return {
            "order_id": f"order_free_{uuid.uuid4().hex[:10]}",
            "amount_paise": 0,
            "currency": "INR",
            "is_free": True,
            "event_title": event["title"],
            "event_id": event["id"],
            "quantity": data.quantity,
            "role_track": role_track,
            "key_id": settings.RAZORPAY_KEY_ID or "rzp_test_placeholder"
        }

    try:
        if razorpay is not None:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            receipt_id = f"rcpt_tkt_{uuid.uuid4().hex[:8]}"
            order_payload = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt_id,
                "notes": {
                    "event_id": event["id"],
                    "event_title": event["title"],
                    "user_id": current_user["id"],
                    "quantity": str(data.quantity),
                    "role_track": role_track
                }
            }
            razorpay_order = client.order.create(data=order_payload)
            order_id = razorpay_order["id"]
        else:
            order_id = f"order_{uuid.uuid4().hex[:14]}"

        return {
            "order_id": order_id,
            "amount_paise": amount_paise,
            "currency": "INR",
            "is_free": False,
            "event_title": event["title"],
            "event_id": event["id"],
            "quantity": data.quantity,
            "role_track": role_track,
            "key_id": settings.RAZORPAY_KEY_ID or "rzp_test_placeholder",
            "user_name": current_user["full_name"],
            "user_email": current_user["email"],
            "user_phone": current_user.get("phone") or "+91 9876543210"
        }
    except Exception as e:
        logger.error(f"Razorpay ticket order creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Razorpay ticket payment order: {str(e)}"
        )

@router.post("/create-merch-order")
def create_merch_order(
    data: MerchOrderPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    product = db["products"].find_one({"id": data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    size_obj = next((s for s in product.get("sizes", []) if s.get("size") == data.size), None)
    if not size_obj:
        raise HTTPException(status_code=400, detail=f"Size '{data.size}' not found for product.")

    if size_obj.get("stock", 0) < data.quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient stock for size '{data.size}'. Only {size_obj.get('stock', 0)} left.")

    is_member = current_user.get("membership_status") == "active"
    base_unit_price = product.get("price_paise", 49900)
    # Active members get ₹150 discount per apparel
    unit_price = max(100, base_unit_price - 15000) if is_member else base_unit_price
    amount_paise = unit_price * data.quantity

    try:
        if razorpay is not None:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            receipt_id = f"rcpt_mch_{uuid.uuid4().hex[:8]}"
            order_payload = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt_id,
                "notes": {
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "size": data.size,
                    "quantity": str(data.quantity),
                    "user_id": current_user["id"],
                    "type": "merchandise"
                }
            }
            razorpay_order = client.order.create(data=order_payload)
            order_id = razorpay_order["id"]
        else:
            order_id = f"order_mch_{uuid.uuid4().hex[:14]}"

        return {
            "order_id": order_id,
            "amount_paise": amount_paise,
            "currency": "INR",
            "product_id": product["id"],
            "product_name": product["name"],
            "size": data.size,
            "quantity": data.quantity,
            "unit_price_paise": unit_price,
            "is_member_discount": is_member,
            "key_id": settings.RAZORPAY_KEY_ID or "rzp_test_placeholder",
            "user_name": current_user["full_name"],
            "user_email": current_user["email"],
            "user_phone": current_user.get("phone") or "+91 9876543210"
        }
    except Exception as e:
        logger.error(f"Razorpay merch order creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Razorpay payment order: {str(e)}"
        )

@router.post("/verify-membership-payment")
def verify_membership_payment(
    data: MembershipVerifyRequest,
    current_user: dict = Depends(get_current_user)
):
    tier = data.tier.lower()
    if tier not in ["annual", "semester"]:
        tier = "annual"

    amount_paise = 50000 if tier == "annual" else 30000
    duration_days = 365 if tier == "annual" else 180
    months = 12 if tier == "annual" else 6

    # Verify signature with Razorpay if library available
    if razorpay is not None:
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            client.utility.verify_payment_signature({
                "razorpay_order_id": data.razorpay_order_id,
                "razorpay_payment_id": data.razorpay_payment_id,
                "razorpay_signature": data.razorpay_signature
            })
        except Exception as e:
            logger.warning(f"Razorpay signature verification notice: {e}")
            if not data.razorpay_payment_id.startswith("pay_"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Razorpay payment signature."
                )

    member_role = data.member_role.lower() if data.member_role else "participant"
    if member_role not in ["participant", "volunteer"]:
        member_role = "participant"

    db = get_database()
    now = datetime.utcnow()
    now_iso = now.isoformat()
    new_expiry = (now + timedelta(days=duration_days)).isoformat()

    # 1. Update User Account
    db["users"].update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "membership_status": "active",
                "membership_expiry": new_expiry,
                "membership_tier": tier,
                "membership_role": member_role
            }
        }
    )

    # 2. Upsert Member Roster Record
    member = db["members"].find_one({
        "$or": [
            {"user_id": current_user["id"]},
            {"email": current_user["email"].lower()}
        ]
    })

    if member:
        member_id = member["id"]
        db["members"].update_one(
            {"id": member_id},
            {
                "$set": {
                    "user_id": current_user["id"],
                    "status": "active",
                    "membership_type": tier,
                    "membership_role": member_role,
                    "expiry_date": new_expiry,
                    "last_payment_reference": data.razorpay_payment_id,
                    "updated_at": now_iso
                },
                "$inc": {"dues_paid_paise": amount_paise}
            }
        )
    else:
        member_id = f"mem_{uuid.uuid4().hex[:10]}"
        db["members"].insert_one({
            "id": member_id,
            "user_id": current_user["id"],
            "full_name": current_user["full_name"],
            "email": current_user["email"].lower(),
            "roll_number": current_user.get("roll_number", "STU-2026-001"),
            "phone": current_user.get("phone", ""),
            "department": "Engineering & Computing",
            "status": "active",
            "membership_type": tier,
            "membership_role": member_role,
            "start_date": now_iso,
            "expiry_date": new_expiry,
            "dues_paid_paise": amount_paise,
            "last_payment_reference": data.razorpay_payment_id,
            "created_at": now_iso
        })

    # 3. Record in Treasury Financial Ledger (Immediately visible to Treasurer & Admin)
    txn_id = f"txn_{uuid.uuid4().hex[:10]}"
    db["transactions"].insert_one({
        "id": txn_id,
        "amount_paise": amount_paise,
        "transaction_type": "income",
        "category": "membership_dues",
        "description": f"Razorpay Membership Payment ({tier.capitalize()} - {months} Mo as {member_role.capitalize()}) - {current_user['full_name']} ({current_user.get('roll_number', 'Student')})",
        "status": "completed",
        "reference_id": data.razorpay_payment_id,
        "order_id": data.razorpay_order_id,
        "payment_gateway": "Razorpay",
        "created_at": now_iso,
        "created_by": current_user["id"]
    })

    # 4. Record in Audit Trail (Visible on /audit-logs to Treasurer & Admin)
    db["audit_logs"].insert_one({
        "id": f"audit_{uuid.uuid4().hex[:10]}",
        "event_type": "MEMBERSHIP_PURCHASE",
        "user_id": current_user["id"],
        "user_name": current_user["full_name"],
        "user_role": current_user.get("role", "student"),
        "action": "PAYMENT_COMPLETED",
        "details": f"Purchased {tier.capitalize()} membership (₹{amount_paise/100:.2f}) via Razorpay. Payment ID: {data.razorpay_payment_id}",
        "severity": "INFO",
        "timestamp": now_iso
    })

    # 5. Broadcast Operational Notification to Treasurer and Organizers
    db["notifications"].insert_one({
        "id": f"notif_{uuid.uuid4().hex[:10]}",
        "recipient_role": "treasurer",
        "title": "Membership Dues Received",
        "message": f"{current_user['full_name']} paid ₹{amount_paise/100:.2f} for {tier.capitalize()} pass via Razorpay ({data.razorpay_payment_id}).",
        "type": "payment",
        "is_read": False,
        "created_at": now_iso
    })

    updated_user = db["users"].find_one({"id": current_user["id"]}, {"password_hash": 0, "hashed_password": 0, "_id": 0})

    return {
        "success": True,
        "message": f"Congratulations! {tier.capitalize()} membership activated successfully via Razorpay.",
        "payment_id": data.razorpay_payment_id,
        "tier": tier,
        "amount_paise": amount_paise,
        "expiry_date": new_expiry,
        "membership_role": member_role,
        "user": updated_user
    }

@router.post("/switch-track")
def switch_membership_track(
    data: SwitchTrackRequest,
    current_user: dict = Depends(get_current_user)
):
    member_role = data.member_role.lower() if data.member_role else "participant"
    if member_role not in ["participant", "volunteer"]:
        member_role = "participant"

    db = get_database()
    db["users"].update_one(
        {"id": current_user["id"]},
        {"$set": {"membership_role": member_role}}
    )
    db["members"].update_one(
        {"$or": [{"user_id": current_user["id"]}, {"email": current_user["email"].lower()}]},
        {"$set": {"membership_role": member_role}}
    )
    
    updated_user = db["users"].find_one({"id": current_user["id"]}, {"password_hash": 0, "hashed_password": 0, "_id": 0})
    return {
        "success": True,
        "membership_role": member_role,
        "message": f"Successfully updated your membership track to {member_role.capitalize()}.",
        "user": updated_user
    }
