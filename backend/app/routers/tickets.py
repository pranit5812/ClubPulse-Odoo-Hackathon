from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.ticket import TicketBookRequest, TicketResponse, TicketCheckInRequest, TicketCheckInResponse
from app.services.ticket_service import TicketService
from app.services.email_service import EmailService
from app.core.dependencies import get_current_user, require_roles
from app.database.mongodb import get_database

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])

@router.post("/book", response_model=TicketResponse)
def book_ticket(
    data: TicketBookRequest,
    current_user: dict = Depends(get_current_user)
):
    return TicketService.book_ticket(data, current_user=current_user)

@router.get("/my-tickets", response_model=List[TicketResponse])
def get_my_tickets(current_user: dict = Depends(get_current_user)):
    return TicketService.list_my_tickets(current_user=current_user)

@router.post("/check-in", response_model=TicketCheckInResponse)
def check_in_ticket(
    data: TicketCheckInRequest,
    current_user: dict = Depends(get_current_user)
):
    user_role = current_user.get("role", "student")
    membership_role = current_user.get("membership_role", "participant")
    is_active_member = current_user.get("membership_status") == "active"
    
    if user_role not in ["organizer", "admin", "treasurer"] and not (is_active_member and membership_role == "volunteer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: requires organizer, admin, treasurer or active volunteer status to check in tickets."
        )
    return TicketService.check_in(data.qr_token, reviewer=current_user)

@router.get("/event/{event_id}/registrations")
def get_event_registrations(
    event_id: str,
    current_user: dict = Depends(require_roles(["admin", "organizer", "treasurer"]))
):
    db = get_database()
    event = db["events"].find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    cursor = db["tickets"].find({"event_id": event_id}).sort("created_at", -1)
    
    total_tickets = 0
    member_tickets = 0
    non_member_tickets = 0
    member_revenue = 0
    non_member_revenue = 0
    registrations = []

    for doc in cursor:
        qty = doc.get("quantity", 1)
        total_tickets += qty
        amount = doc.get("total_amount_paise", 0)
        is_member = bool(doc.get("is_member_discount_applied", False))

        if is_member:
            member_tickets += qty
            member_revenue += amount
        else:
            non_member_tickets += qty
            non_member_revenue += amount

        registrations.append({
            "id": doc["id"],
            "user_id": doc.get("user_id", ""),
            "user_name": doc.get("user_name", "Anonymous"),
            "user_email": doc.get("user_email", ""),
            "quantity": qty,
            "total_amount_paise": amount,
            "is_member": is_member,
            "role_track": doc.get("role_track", "participant"),
            "checked_in": doc.get("checked_in", False),
            "checked_in_at": doc.get("checked_in_at", None),
            "qr_token": doc.get("qr_token", ""),
            "created_at": doc.get("created_at", "")
        })

    return {
        "event_id": event["id"],
        "event_title": event.get("title", ""),
        "event_date": event.get("event_date", ""),
        "venue": event.get("venue", ""),
        "capacity": event.get("capacity", 0),
        "booked_count": event.get("booked_count", 0),
        "total_tickets": total_tickets,
        "member_count": member_tickets,
        "non_member_count": non_member_tickets,
        "member_revenue_paise": member_revenue,
        "non_member_revenue_paise": non_member_revenue,
        "total_revenue_paise": member_revenue + non_member_revenue,
        "registrations": registrations
    }

@router.get("/events-summary")
def get_all_events_registration_summary(
    current_user: dict = Depends(require_roles(["admin", "organizer", "treasurer"]))
):
    db = get_database()
    events_cursor = db["events"].find({}).sort("created_at", -1)
    
    summaries = []
    for ev in events_cursor:
        ev_id = ev["id"]
        tickets_cursor = db["tickets"].find({"event_id": ev_id})
        
        member_count = 0
        non_member_count = 0
        total_revenue = 0

        for t in tickets_cursor:
            qty = t.get("quantity", 1)
            amt = t.get("total_amount_paise", 0)
            total_revenue += amt
            if t.get("is_member_discount_applied", False):
                member_count += qty
            else:
                non_member_count += qty

        summaries.append({
            "event_id": ev_id,
            "event_title": ev.get("title", ""),
            "event_date": ev.get("event_date", ""),
            "venue": ev.get("venue", ""),
            "capacity": ev.get("capacity", 0),
            "booked_count": ev.get("booked_count", 0),
            "member_count": member_count,
            "non_member_count": non_member_count,
            "total_tickets": member_count + non_member_count,
            "total_revenue_paise": total_revenue,
            "is_published": ev.get("is_published", False)
        })

    return summaries

@router.post("/{ticket_id}/resend-email")
def resend_ticket_email(
    ticket_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    ticket = db["tickets"].find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    if ticket["user_id"] != current_user["id"] and current_user.get("role") not in ["admin", "organizer"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this pass.")

    event = db["events"].find_one({"id": ticket["event_id"]}) or {}
    success = EmailService.send_ticket_qr_email(ticket, current_user, event)
    return {
        "success": success,
        "message": "Ticket QR pass has been emailed to your registered address!" if success else "Email dispatch queued (check console fallback)."
    }
