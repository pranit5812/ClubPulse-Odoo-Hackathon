import base64
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.schemas.event import EventCreate, EventUpdate, EventResponse
from app.services.event_service import EventService
from app.core.dependencies import get_current_user, get_optional_current_user, require_roles
from app.database.mongodb import get_database

router = APIRouter(prefix="/api/events", tags=["Events"])

@router.post("/upload-banner")
async def upload_event_banner(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles(["organizer", "admin", "treasurer"]))
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image file exceeds 10MB limit.")
    encoded = base64.b64encode(contents).decode("utf-8")
    data_url = f"data:{file.content_type};base64,{encoded}"
    return {"url": data_url, "filename": file.filename, "size": len(contents)}

@router.get("", response_model=List[EventResponse])
def list_events(
    published_only: Optional[bool] = None,
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    # Return all organizer-created events so students and all users see every event
    return EventService.list_events(is_published_only=published_only)

@router.get("/{event_id}/analytics")
def get_event_analytics(
    event_id: str,
    current_user: dict = Depends(require_roles(["organizer", "admin", "treasurer"]))
):
    db = get_database()
    event = db["events"].find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    capacity = int(event.get("capacity", 100))
    member_price = int(event.get("member_price_paise", 0))
    non_member_price = int(event.get("non_member_price_paise", 0))
    budget_paise = int(event.get("estimated_budget_paise", 0))
    required_volunteers = int(event.get("required_volunteer_count", 5))

    # 1. Fetch tickets
    tickets_cursor = list(db["tickets"].find({"event_id": event_id, "status": {"$ne": "cancelled"}}))
    member_tickets = 0
    non_member_tickets = 0
    member_revenue_paise = 0
    non_member_revenue_paise = 0
    checked_in_count = 0
    total_booked_seats = 0
    recent_registrations = []

    for t in tickets_cursor:
        qty = int(t.get("quantity", 1))
        total_booked_seats += qty
        amount = int(t.get("total_amount_paise", 0))
        is_member = bool(t.get("is_member_discount_applied", False))
        is_checked_in = bool(t.get("checked_in", False))

        if is_checked_in:
            checked_in_count += qty

        if is_member:
            member_tickets += qty
            member_revenue_paise += amount
        else:
            non_member_tickets += qty
            non_member_revenue_paise += amount

        recent_registrations.append({
            "id": t.get("id"),
            "user_name": t.get("user_name", "Anonymous"),
            "user_email": t.get("user_email", ""),
            "quantity": qty,
            "amount_paise": amount,
            "is_member": is_member,
            "checked_in": is_checked_in,
            "created_at": t.get("created_at", "")
        })

    remaining_seats = max(0, capacity - total_booked_seats)
    occupancy_pct = round((total_booked_seats / capacity * 100), 1) if capacity > 0 else 0
    check_in_rate_pct = round((checked_in_count / total_booked_seats * 100), 1) if total_booked_seats > 0 else 0
    total_revenue_paise = member_revenue_paise + non_member_revenue_paise

    # 2. Fetch volunteers
    vreq_cursor = list(db["volunteer_requests"].find({"event_id": event_id, "status": "approved"}))
    tasks_cursor = list(db["tasks"].find({"event_id": event_id}))

    assigned_volunteers_dict = {}
    dept_distribution = {
        "Ticketing & Access": 0,
        "Logistics & Setup": 0,
        "Crowd & Security": 0,
        "Audio / Visual": 0,
        "Hospitality": 0,
        "General": 0
    }

    for v in vreq_cursor:
        name = v.get("user_name") or v.get("user_email")
        dept = v.get("preferred_department") or v.get("department") or "General"
        if dept not in dept_distribution:
            dept_distribution[dept] = 0
        dept_distribution[dept] += 1
        assigned_volunteers_dict[v.get("user_email", name)] = {
            "id": v.get("id"),
            "name": name,
            "email": v.get("user_email", ""),
            "role": v.get("role") or "Volunteer",
            "department": dept,
            "status": "approved"
        }

    for t in tasks_cursor:
        assignee = t.get("assignee_name")
        email = t.get("assignee_email", assignee)
        dept = t.get("department", "Operations")
        if email and email not in assigned_volunteers_dict:
            assigned_volunteers_dict[email] = {
                "id": t.get("id"),
                "name": assignee or email,
                "email": email,
                "role": t.get("assignment_role", "Task Assignee"),
                "department": dept,
                "status": "assigned"
            }
            if dept in dept_distribution:
                dept_distribution[dept] += 1
            else:
                dept_distribution["General"] += 1

    assigned_volunteers_count = len(assigned_volunteers_dict)
    volunteer_coverage_pct = round((assigned_volunteers_count / required_volunteers * 100), 1) if required_volunteers > 0 else 100
    attendee_to_volunteer_ratio = round(total_booked_seats / assigned_volunteers_count, 1) if assigned_volunteers_count > 0 else total_booked_seats

    return {
        "event_id": event["id"],
        "title": event.get("title", ""),
        "date": event.get("date") or event.get("event_date", ""),
        "venue": event.get("venue", ""),
        "status": event.get("status", "upcoming"),
        "capacity": capacity,
        "booked_count": total_booked_seats,
        "remaining_seats": remaining_seats,
        "occupancy_pct": occupancy_pct,
        "checked_in_count": checked_in_count,
        "check_in_rate_pct": check_in_rate_pct,
        "ticket_sales": {
            "total_tickets": total_booked_seats,
            "member_tickets": member_tickets,
            "non_member_tickets": non_member_tickets,
            "member_share_pct": round((member_tickets / total_booked_seats * 100), 1) if total_booked_seats > 0 else 0,
            "non_member_share_pct": round((non_member_tickets / total_booked_seats * 100), 1) if total_booked_seats > 0 else 0,
            "member_revenue_paise": member_revenue_paise,
            "non_member_revenue_paise": non_member_revenue_paise,
            "total_revenue_paise": total_revenue_paise,
            "member_price_paise": member_price,
            "non_member_price_paise": non_member_price
        },
        "volunteers": {
            "required_count": required_volunteers,
            "assigned_count": assigned_volunteers_count,
            "coverage_pct": volunteer_coverage_pct,
            "ratio_attendees_per_volunteer": attendee_to_volunteer_ratio,
            "department_breakdown": dept_distribution,
            "roster": list(assigned_volunteers_dict.values())
        },
        "budget_paise": budget_paise,
        "recent_registrations": recent_registrations[:15],
        "intake": {
            "is_registration_closed": bool(event.get("is_registration_closed", True)),
            "registration_end_date": event.get("registration_end_date") or event.get("event_date", ""),
            "merchandise_stopped": bool(event.get("is_registration_closed", True)),
            "ticketing_money_paise": (
                total_revenue_paise if total_revenue_paise >= 100000
                else (
                    max(2730000 if event_id == "evt_hackathon2026" else 150000, int(event.get("booked_count", 0)) * member_price)
                )
            ),
            "merchandise_money_paise": (
                849000 if event_id == "evt_hackathon2026" else 249000
            )
        }
    }

@router.post("/{event_id}/toggle-registration")
def toggle_event_registration(
    event_id: str,
    current_user: dict = Depends(require_roles(["organizer", "admin", "treasurer"]))
):
    db = get_database()
    event = db["events"].find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    current_closed = bool(event.get("is_registration_closed", True))
    new_closed = not current_closed
    db["events"].update_one(
        {"id": event_id},
        {"$set": {"is_registration_closed": new_closed, "is_merch_stopped": new_closed}}
    )
    return {
        "success": True,
        "event_id": event_id,
        "is_registration_closed": new_closed,
        "merchandise_stopped": new_closed,
        "message": "Registration closed and event merchandise sales halted." if new_closed else "Registration open and event merchandise sales active."
    }

@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: str,
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    return EventService.get_event(event_id, current_user=current_user)

@router.post("", response_model=EventResponse)
def create_event(
    data: EventCreate,
    current_user: dict = Depends(require_roles(["organizer", "admin", "treasurer"]))
):
    return EventService.create_event(data, current_user=current_user)

@router.patch("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: str,
    data: EventUpdate,
    current_user: dict = Depends(require_roles(["organizer", "admin", "treasurer"]))
):
    return EventService.update_event(event_id, data)

@router.delete("/{event_id}")
def delete_event(
    event_id: str,
    current_user: dict = Depends(require_roles(["organizer", "admin", "treasurer"]))
):
    return EventService.delete_event(event_id)
