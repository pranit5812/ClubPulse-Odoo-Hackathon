import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.database.mongodb import get_database
from app.core.dependencies import get_current_user, require_roles
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/events", tags=["Volunteer Applications"])

class VolunteerApplyResponse(BaseModel):
    success: bool
    message: str
    status: str
    request_id: Optional[str] = None

@router.post("/{event_id}/opt-to-volunteer", response_model=VolunteerApplyResponse)
def opt_to_volunteer(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    
    # 1. Verify Event Exists
    event = db["events"].find_one({"id": event_id})
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found."
        )

    # 2. Check if user already booked a ticket for this event
    existing_ticket = db["tickets"].find_one({
        "event_id": event_id,
        "user_id": current_user["id"],
        "status": {"$ne": "cancelled"}
    })
    if existing_ticket:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already registered a participant ticket for this event. You cannot volunteer for an event you are attending as a paid/registered participant."
        )

    # 3. Check existing volunteer application status
    existing_req = db["volunteer_requests"].find_one({
        "event_id": event_id,
        "user_id": current_user["id"]
    })

    if existing_req:
        if existing_req.get("status") == "approved":
            return VolunteerApplyResponse(
                success=True,
                message="You are already an approved volunteer for this event.",
                status="approved",
                request_id=existing_req["id"]
            )
        elif existing_req.get("status") == "pending":
            return VolunteerApplyResponse(
                success=True,
                message="Your volunteer application is currently pending admin approval.",
                status="pending",
                request_id=existing_req["id"]
            )
        # If rejected previously, allow re-application
        elif existing_req.get("status") == "rejected":
            db["volunteer_requests"].delete_one({"id": existing_req["id"]})

    # 4. Create new volunteer application document
    req_id = f"vreq_{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # Guarantee full student information from db["users"]
    db_user = db["users"].find_one({"id": current_user["id"]}) or current_user

    new_doc = {
        "id": req_id,
        "event_id": event_id,
        "event_title": event.get("title", "Event"),
        "event_date": event.get("event_date", ""),
        "venue": event.get("venue", ""),
        "user_id": current_user["id"],
        "user_name": db_user.get("full_name") or current_user.get("full_name", "Student Volunteer"),
        "user_email": (db_user.get("email") or current_user.get("email", "")).lower(),
        "user_roll": db_user.get("roll_number") or current_user.get("roll_number", ""),
        "status": "pending",
        "created_at": now_iso,
        "updated_at": now_iso
    }
    db["volunteer_requests"].insert_one(new_doc)

    # 5. Send Notification to Admin & Organizers
    create_notification(
        title=f"New Volunteer Request: {new_doc['user_name']}",
        message=f"{new_doc['user_name']} requested to volunteer for '{event.get('title')}'. Awaiting Admin approval in Volunteer Registrations.",
        category="volunteer",
        severity="info",
        target_roles=["admin", "organizer"],
        deduplication_key=f"vol_req_admin_{current_user['id']}_{event_id}",
        related_entity_type="volunteer_request",
        related_entity_id=req_id,
        target_route="/organizer/volunteers"
    )

    # 6. Send Notification to Student
    create_notification(
        title="Volunteer Request Sent to Admin",
        message=f"Your volunteer application for '{event.get('title')}' was sent to Admin for approval. You will be notified once reviewed.",
        category="volunteer",
        severity="info",
        target_roles=["student", "user"],
        deduplication_key=f"vol_req_stu_{req_id}",
        related_entity_type="volunteer_request",
        related_entity_id=req_id
    )

    return VolunteerApplyResponse(
        success=True,
        message=f"Volunteer request for '{event.get('title')}' submitted to Admin for approval.",
        status="pending",
        request_id=req_id
    )

@router.get("/my-volunteer-applications")
def get_my_volunteer_applications(
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    cursor = db["volunteer_requests"].find({"user_id": current_user["id"]}).sort("created_at", -1)
    results = []
    for doc in cursor:
        results.append({
            "id": doc["id"],
            "event_id": doc["event_id"],
            "event_title": doc.get("event_title", ""),
            "event_date": doc.get("event_date", ""),
            "venue": doc.get("venue", ""),
            "status": doc.get("status", "pending"),
            "created_at": doc.get("created_at", ""),
            "updated_at": doc.get("updated_at", "")
        })
    return results

@router.get("/volunteer-applications")
def list_all_volunteer_applications(
    current_user: dict = Depends(require_roles(["admin", "organizer", "treasurer"]))
):
    db = get_database()
    cursor = db["volunteer_requests"].find({}).sort("created_at", -1)
    results = []
    
    events_cache = {}
    users_cache = {}

    for doc in cursor:
        event_id = doc.get("event_id")
        event_title = doc.get("event_title")
        event_date = doc.get("event_date")
        venue = doc.get("venue")
        
        if (not event_title or not event_date) and event_id:
            if event_id not in events_cache:
                events_cache[event_id] = db["events"].find_one({"id": event_id})
            ev = events_cache.get(event_id)
            if ev:
                event_title = event_title or ev.get("title", "Event")
                event_date = event_date or ev.get("event_date", "")
                venue = venue or ev.get("venue", "")

        user_id = doc.get("user_id")
        user_name = doc.get("user_name")
        user_email = doc.get("user_email")
        user_roll = doc.get("user_roll")
        
        if (not user_name or not user_email) and user_id:
            if user_id not in users_cache:
                users_cache[user_id] = db["users"].find_one({"id": user_id})
            u = users_cache.get(user_id)
            if u:
                user_name = user_name or u.get("full_name", "Student")
                user_email = user_email or u.get("email", "")
                user_roll = user_roll or u.get("roll_number", "")

        results.append({
            "id": doc["id"],
            "event_id": event_id,
            "event_title": event_title or "Event",
            "event_date": event_date or "",
            "venue": venue or "",
            "user_id": user_id,
            "user_name": user_name or "Student",
            "user_email": user_email or "",
            "user_roll": user_roll or "",
            "status": doc.get("status", "pending"),
            "reviewed_by": doc.get("reviewed_by", None),
            "created_at": doc.get("created_at", ""),
            "updated_at": doc.get("updated_at", "")
        })
    return results

@router.post("/volunteer-applications/{request_id}/approve")
def approve_volunteer_application(
    request_id: str,
    current_user: dict = Depends(require_roles(["admin", "organizer"]))
):
    db = get_database()
    req = db["volunteer_requests"].find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Volunteer application not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    db["volunteer_requests"].update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "approved",
                "reviewed_by": current_user.get("full_name", "Admin"),
                "updated_at": now_iso
            }
        }
    )

    # Promote student to volunteer status and record their event
    db["users"].update_one(
        {"id": req["user_id"]},
        {
            "$set": {
                "is_volunteer": True,
                "membership_role": "volunteer"
            },
            "$addToSet": {
                "volunteer_events": req["event_id"]
            }
        }
    )

    db["members"].update_one(
        {"$or": [{"user_id": req["user_id"]}, {"email": req["user_email"].lower()}]},
        {"$set": {"membership_role": "volunteer"}}
    )

    # Send Notification to Student
    create_notification(
        title="Volunteer Application Approved! 🎉",
        message=f"Congratulations! Admin has approved your volunteer role for '{req.get('event_title')}'. Attendee registration is reserved for you, and volunteer features (Reimbursements & Tasks) are now active.",
        category="volunteer",
        severity="success",
        target_roles=["student", "user"],
        deduplication_key=f"vol_appr_stu_{request_id}",
        related_entity_type="volunteer_request",
        related_entity_id=request_id,
        target_route="/expenses"
    )

    return {
        "success": True,
        "message": f"{req.get('user_name')} is now an approved volunteer for '{req.get('event_title')}'.",
        "request_id": request_id,
        "status": "approved"
    }

@router.post("/volunteer-applications/{request_id}/reject")
def reject_volunteer_application(
    request_id: str,
    current_user: dict = Depends(require_roles(["admin", "organizer"]))
):
    db = get_database()
    req = db["volunteer_requests"].find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Volunteer application not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    db["volunteer_requests"].update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "rejected",
                "reviewed_by": current_user.get("full_name", "Admin"),
                "updated_at": now_iso
            }
        }
    )

    # Notify student
    create_notification(
        title="Volunteer Application Update",
        message=f"Your volunteer application for '{req.get('event_title')}' was not approved at this time.",
        category="volunteer",
        severity="warning",
        target_roles=["student", "user"],
        deduplication_key=f"vol_rej_stu_{request_id}",
        related_entity_type="volunteer_request",
        related_entity_id=request_id
    )

    return {
        "success": True,
        "message": "Volunteer application rejected.",
        "request_id": request_id,
        "status": "rejected"
    }

@router.get("/available-volunteers")
def get_available_volunteers(
    event_id: Optional[str] = None,
    department: Optional[str] = None,
    only_available: bool = False,
    current_user: dict = Depends(require_roles(["admin", "organizer", "treasurer"]))
):
    db = get_database()
    
    # 1. Fetch approved volunteer applications for this specific event (or all events)
    vreq_query = {"status": "approved"}
    if event_id:
        vreq_query["event_id"] = event_id
        
    vreqs = list(db["volunteer_requests"].find(vreq_query))
    all_approved_vreqs = list(db["volunteer_requests"].find({"status": "approved"}))
    
    # 2. Fetch users explicitly flagged as volunteer (volunteer squad)
    vol_users = list(db["users"].find({"$or": [{"is_volunteer": True}, {"role": "volunteer"}]}))
    
    volunteers_dict = {}
    
    # Priority 1: Volunteers approved specifically for this event
    for v in vreqs:
        name = v.get("user_name")
        if name and name.strip():
            volunteers_dict[name.strip()] = {
                "id": v.get("user_id") or v["id"],
                "name": name.strip(),
                "email": v.get("user_email", ""),
                "roll_number": v.get("user_roll", ""),
                "event_id": v.get("event_id"),
                "is_event_applicant": True,
                "source": f"Approved for {v.get('event_title', 'Event')}"
            }
            
    # Priority 2: Registered club volunteer squad
    for u in vol_users:
        name = u.get("full_name")
        if name and name.strip() and name.strip() not in volunteers_dict:
            volunteers_dict[name.strip()] = {
                "id": u["id"],
                "name": name.strip(),
                "email": u.get("email", ""),
                "roll_number": u.get("roll_number", ""),
                "event_id": None,
                "is_event_applicant": False,
                "source": "Club Volunteer Pool"
            }

    # Priority 3: Approved volunteers from other events (active volunteer pool)
    for v in all_approved_vreqs:
        name = v.get("user_name")
        if name and name.strip() and name.strip() not in volunteers_dict:
            volunteers_dict[name.strip()] = {
                "id": v.get("user_id") or v["id"],
                "name": name.strip(),
                "email": v.get("user_email", ""),
                "roll_number": v.get("user_roll", ""),
                "event_id": v.get("event_id"),
                "is_event_applicant": False,
                "source": f"Approved Volunteer ({v.get('event_title', 'Fest')})"
            }

    # 3. Check assignments in tasks
    # In an event, a volunteer assigned to a department is actively allocated
    task_query = {}
    if event_id:
        task_query["event_id"] = event_id

    tasks = list(db["tasks"].find(task_query))
    assigned_roles = {}
    for t in tasks:
        assignee = t.get("assignee_name")
        if assignee and assignee.strip():
            assigned_roles[assignee.strip().lower()] = {
                "task_title": t.get("title", ""),
                "role": t.get("assignment_role", "Volunteer"),
                "department": t.get("department", "Operations")
            }

    results = []
    for name, v in volunteers_dict.items():
        existing = assigned_roles.get(name.strip().lower())
        is_assigned = existing is not None
        available = not is_assigned
        assigned_dept = existing.get("department") if existing else None
        assigned_role = existing.get("role") if existing else None

        item = {
            **v,
            "is_assigned": is_assigned,
            "assigned_role": assigned_role,
            "assigned_department": assigned_dept,
            "available": available
        }
        
        if only_available and not available:
            continue

        results.append(item)

    results.sort(key=lambda x: (not x["is_event_applicant"], not x["available"], x["name"]))
    return results

