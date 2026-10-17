import uuid
import re
import io
import json
import base64
import threading
from datetime import datetime
from typing import List
from fastapi import HTTPException, status
from app.database.mongodb import get_database
from app.schemas.ticket import TicketBookRequest, TicketResponse, TicketCheckInResponse
from app.services.email_service import EmailService


def _build_qr_text(ticket_doc: dict) -> str:
    """Build the same human-readable QR text payload used by the email service."""
    lines = [
        "🎓 ClubPulse Verified Event Pass",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        f"👤 Attendee: {ticket_doc.get('user_name', 'Student')}",
        f"🆔 Roll No: {ticket_doc.get('user_roll_number', 'STU-VERIFIED')}",
        f"🏛️ Department: {ticket_doc.get('user_department', 'General')}",
        f"📧 Email: {ticket_doc.get('user_email', '')}",
    ]
    phone = ticket_doc.get('user_phone', '')
    if phone:
        lines.append(f"📞 Phone: {phone}")
    is_member = ticket_doc.get('membership_status') == 'active'
    track = ticket_doc.get('role_track', 'participant')
    lines.extend([
        f"⭐ Membership: {'Active Club Member' if is_member else 'General Attendee'}",
        f"🎟️ Pass Track: {'Volunteer Operations Pass' if track == 'volunteer' else 'Participant Attendee Pass'}",
        "",
        f"📅 Event: {ticket_doc.get('event_title', '')}",
        f"🕒 Date & Time: {ticket_doc.get('event_date', '')}",
        f"📍 Venue: {ticket_doc.get('venue', '')}",
        f"🎫 Pass Token: {ticket_doc.get('qr_token', '')}",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "Official Gate Credential • Present for Entry",
    ])
    return "\n".join(lines)


def _generate_qr_base64(text: str) -> str:
    """Generate a QR code PNG and return as base64 data URL string."""
    try:
        import qrcode
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=2,
        )
        qr.add_data(text)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#171A2B", back_color="#FFFFFF")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"data:image/png;base64,{b64}"
    except Exception as e:
        print(f"[QR-GEN-ERR] Failed to generate QR image: {e}")
        return ""

class TicketService:
    @staticmethod
    def book_ticket(data: TicketBookRequest, current_user: dict) -> TicketResponse:
        db = get_database()
        event = db["events"].find_one({"id": data.event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found.")
        
        if not event.get("is_published", False):
            raise HTTPException(status_code=400, detail="Event is not published for booking.")

        if event.get("is_ended", False) or event.get("status") == "ended":
            raise HTTPException(status_code=400, detail="This event has concluded. Ticket bookings are closed.")

        # Check membership status for discount
        is_member = current_user.get("membership_status") == "active"
        unit_price = event["member_price_paise"] if is_member else event["non_member_price_paise"]
        total_amount = unit_price * data.quantity

        # Prevent already enrolled attendees from re-registering for the same event
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

        # Prevent approved volunteers for this event from registering as participants
        vol_req = db["volunteer_requests"].find_one({
            "event_id": data.event_id,
            "user_id": current_user["id"],
            "status": "approved"
        })
        if vol_req:
            raise HTTPException(
                status_code=400,
                detail="You are already an approved volunteer for this event. Attendee pass registration is closed for volunteers."
            )

        # Atomic capacity lock
        # Update booked_count ONLY IF current booked_count + quantity <= capacity
        update_result = db["events"].update_one(
            {
                "id": data.event_id,
                "$expr": {
                    "$lte": [
                        {"$add": ["$booked_count", data.quantity]},
                        "$capacity"
                    ]
                }
            },
            {"$inc": {"booked_count": data.quantity}}
        )

        if update_result.modified_count == 0:
            # Check if sold out
            current_event = db["events"].find_one({"id": data.event_id})
            remaining = current_event["capacity"] - current_event.get("booked_count", 0)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot book {data.quantity} ticket(s). Only {max(0, remaining)} seats remain."
            )

        ticket_id = f"tkt_{uuid.uuid4().hex[:10]}"
        qr_token = f"CP-TKT-{data.event_id[:5]}-{uuid.uuid4().hex[:8].upper()}"
        now_iso = datetime.utcnow().isoformat()
        role_track = (data.role_track or "participant").lower()
        if role_track not in ["participant", "volunteer"]:
            role_track = "participant"

        # If user is active member and registers as volunteer, update membership_role
        if is_member and role_track == "volunteer":
            db["users"].update_one(
                {"id": current_user["id"]},
                {"$set": {"membership_role": "volunteer"}}
            )
            db["members"].update_one(
                {"$or": [{"user_id": current_user["id"]}, {"email": current_user["email"].lower()}]},
                {"$set": {"membership_role": "volunteer"}}
            )

        ticket_doc = {
            "id": ticket_id,
            "event_id": event["id"],
            "event_title": event["title"],
            "event_date": event["event_date"],
            "venue": event["venue"],
            "user_id": current_user["id"],
            "user_name": current_user["full_name"],
            "user_email": current_user["email"],
            "user_roll_number": current_user.get("roll_number", ""),
            "user_department": current_user.get("department", ""),
            "user_phone": current_user.get("phone", ""),
            "membership_status": current_user.get("membership_status", "non_member"),
            "quantity": data.quantity,
            "total_amount_paise": total_amount,
            "is_member_discount_applied": is_member,
            "role_track": role_track,
            "qr_token": qr_token,
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature,
            "checked_in": False,
            "checked_in_at": None,
            "created_at": now_iso
        }

        # Generate and store the QR image in the DB
        qr_text = _build_qr_text(ticket_doc)
        ticket_doc["qr_image"] = _generate_qr_base64(qr_text)

        db["tickets"].insert_one(ticket_doc)

        # Automatically email the QR code pass to user's registered email
        try:
            threading.Thread(
                target=EmailService.send_ticket_qr_email,
                args=(ticket_doc, current_user, event),
                daemon=True
            ).start()
        except Exception as err:
            print(f"[TICKET-EMAIL-DISPATCH-ERR] Could not start email thread: {err}")

        # Record income transaction in the ledger
        if total_amount > 0:
            db["transactions"].insert_one({
                "id": f"txn_{uuid.uuid4().hex[:10]}",
                "amount_paise": total_amount,
                "transaction_type": "income",
                "category": "ticket_sale",
                "description": f"Ticket booking ({role_track.capitalize()}) for {event['title']} ({data.quantity} tickets by {current_user['full_name']})",
                "status": "completed",
                "reference_id": ticket_id,
                "event_id": event["id"],
                "razorpay_payment_id": data.razorpay_payment_id,
                "razorpay_order_id": data.razorpay_order_id,
                "created_at": now_iso,
                "created_by": current_user["id"]
            })

        return TicketResponse(**{k: v for k, v in ticket_doc.items() if k != "_id"})

    @staticmethod
    def list_my_tickets(current_user: dict) -> List[TicketResponse]:
        db = get_database()
        cursor = db["tickets"].find({"user_id": current_user["id"]}).sort("created_at", -1)
        results = []
        for doc in cursor:
            # If older tickets have no qr_image stored, generate it now and save
            qr_image = doc.get("qr_image", "")
            if not qr_image:
                qr_text = _build_qr_text(doc)
                qr_image = _generate_qr_base64(qr_text)
                db["tickets"].update_one({"id": doc["id"]}, {"$set": {"qr_image": qr_image}})

            results.append(TicketResponse(
                id=doc["id"],
                event_id=doc["event_id"],
                event_title=doc["event_title"],
                event_date=doc["event_date"],
                venue=doc["venue"],
                user_id=doc["user_id"],
                user_name=doc["user_name"],
                user_email=doc["user_email"],
                user_roll_number=doc.get("user_roll_number") or current_user.get("roll_number", ""),
                user_department=doc.get("user_department") or current_user.get("department", ""),
                user_phone=doc.get("user_phone") or current_user.get("phone", ""),
                membership_status=doc.get("membership_status") or current_user.get("membership_status", "non_member"),
                quantity=doc["quantity"],
                total_amount_paise=doc["total_amount_paise"],
                is_member_discount_applied=doc.get("is_member_discount_applied", False),
                role_track=doc.get("role_track", "participant"),
                qr_token=doc["qr_token"],
                qr_image=qr_image,
                razorpay_order_id=doc.get("razorpay_order_id"),
                razorpay_payment_id=doc.get("razorpay_payment_id"),
                razorpay_signature=doc.get("razorpay_signature"),
                checked_in=doc.get("checked_in", False),
                checked_in_at=doc.get("checked_in_at"),
                created_at=doc.get("created_at", "")
            ))
        return results

    @staticmethod
    def check_in(qr_token: str, reviewer: dict) -> TicketCheckInResponse:
        db = get_database()
        token_str = qr_token.strip()

        # 1. Check if token is in formatted human-readable text (e.g. "Pass Token: CP-TKT-...")
        token_match = re.search(r"Pass Token:\s*([A-Za-z0-9_-]+)", token_str, re.IGNORECASE)
        if token_match:
            token_str = token_match.group(1).strip()
        elif token_str.startswith("{") and "qr_token" in token_str:
            try:
                parsed = json.loads(token_str)
                token_str = parsed.get("qr_token", token_str).strip()
            except Exception:
                pass
        else:
            # Fallback regex search for CP-TKT-... inside scanned payload
            cp_match = re.search(r"(CP-TKT-[A-Za-z0-9_-]+)", token_str, re.IGNORECASE)
            if cp_match:
                token_str = cp_match.group(1).strip()

        ticket = db["tickets"].find_one({"qr_token": token_str})
        if not ticket:
            return TicketCheckInResponse(
                success=False,
                message="Invalid ticket QR code. No booking record found."
            )
        
        if ticket.get("checked_in", False):
            check_in_time = ticket.get("checked_in_at", "earlier")
            return TicketCheckInResponse(
                success=False,
                message=f"Duplicate check-in rejected! Ticket was already checked in at {check_in_time}.",
                ticket_id=ticket["id"],
                attendee_name=ticket["user_name"],
                attendee_roll_number=ticket.get("user_roll_number"),
                attendee_department=ticket.get("user_department"),
                attendee_email=ticket.get("user_email"),
                event_title=ticket["event_title"],
                checked_in_at=check_in_time
            )

        now_iso = datetime.utcnow().isoformat()
        
        # Atomic check-in
        updated = db["tickets"].find_one_and_update(
            {"qr_token": token_str, "checked_in": False},
            {"$set": {"checked_in": True, "checked_in_at": now_iso}}
        )

        if not updated:
            return TicketCheckInResponse(
                success=False,
                message="Check-in conflict. Ticket may have just been verified on another terminal."
            )

        # Increment attendance on the event
        db["events"].update_one(
            {"id": ticket["event_id"]},
            {"$inc": {"checked_in_count": ticket.get("quantity", 1)}}
        )

        return TicketCheckInResponse(
            success=True,
            message=f"Verified! Welcome {ticket['user_name']} ({ticket['quantity']} attendee(s)).",
            ticket_id=ticket["id"],
            attendee_name=ticket["user_name"],
            attendee_roll_number=ticket.get("user_roll_number"),
            attendee_department=ticket.get("user_department"),
            attendee_email=ticket.get("user_email"),
            event_title=ticket["event_title"],
            checked_in_at=now_iso
        )
