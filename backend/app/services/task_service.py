import uuid
import re
from datetime import datetime, date
from typing import List, Optional
from fastapi import HTTPException
from app.database.mongodb import get_database
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse

DEPARTMENTS = [
    "Branding",
    "Logistics",
    "Food & Beverages",
    "Technical",
    "Public Relations",
    "Operations",
    "Decorations & Stage",
    "Hospitality"
]

def _sync_volunteer_assignment(
    db,
    event_id: Optional[str],
    event_title: Optional[str],
    assignee_id: Optional[str],
    assignee_name: Optional[str],
    assignee_email: Optional[str],
    department: str,
    role: str,
    task_title: str,
    task_id: str,
    due_date: str
):
    """
    Ensures that when a task is created or updated:
    1. Resolves the real student/volunteer user document.
    2. Automatically assigns the event to the volunteer (users.volunteer_events, is_volunteer=True).
    3. Updates members collection and creates/approves volunteer_requests entry.
    4. Issues a direct notification to the student.
    """
    user = None
    # 1. Search by assignee_id if valid
    if assignee_id and not assignee_id.startswith(("usr_vol_auto", "vol_auto", "usr_auto")):
        user = db["users"].find_one({"id": assignee_id})

    # 2. Search by assignee_email
    if not user and assignee_email:
        user = db["users"].find_one({"email": assignee_email.lower().strip()})

    # 3. Search by assignee_name in users
    if not user and assignee_name and assignee_name.strip():
        clean_name = assignee_name.strip()
        user = db["users"].find_one({"full_name": {"$regex": f"^{re.escape(clean_name)}$", "$options": "i"}})

    # 4. Search in volunteer_requests to link user_id
    if not user and assignee_name and assignee_name.strip():
        clean_name = assignee_name.strip()
        vreq = db["volunteer_requests"].find_one({"user_name": {"$regex": f"^{re.escape(clean_name)}$", "$options": "i"}})
        if vreq and vreq.get("user_id"):
            user = db["users"].find_one({"id": vreq["user_id"]})

    real_id = assignee_id
    real_name = assignee_name
    real_email = assignee_email

    if user:
        real_id = user["id"]
        real_name = user.get("full_name") or assignee_name
        real_email = user.get("email") or assignee_email
        now_iso = datetime.utcnow().isoformat()

        # If an event is associated, assign the event to the volunteer
        if event_id:
            # Update users collection
            db["users"].update_one(
                {"id": user["id"]},
                {
                    "$set": {
                        "is_volunteer": True,
                        "membership_role": "volunteer"
                    },
                    "$addToSet": {
                        "volunteer_events": event_id
                    }
                }
            )

            # Update members collection
            db["members"].update_many(
                {"$or": [{"user_id": user["id"]}, {"email": user.get("email")}]},
                {"$set": {"membership_role": "volunteer"}}
            )

            # Update or create volunteer_requests entry (marked approved)
            vreq_existing = db["volunteer_requests"].find_one({
                "event_id": event_id,
                "$or": [{"user_id": user["id"]}, {"user_email": user.get("email")}]
            })
            if vreq_existing:
                db["volunteer_requests"].update_one(
                    {"id": vreq_existing["id"]},
                    {"$set": {
                        "status": "approved",
                        "department": department,
                        "role": role,
                        "updated_at": now_iso
                    }}
                )
            else:
                db["volunteer_requests"].insert_one({
                    "id": f"vreq_{uuid.uuid4().hex[:8]}",
                    "event_id": event_id,
                    "event_title": event_title or "Assigned Event",
                    "user_id": user["id"],
                    "user_name": real_name,
                    "user_email": real_email or "",
                    "user_roll": user.get("roll_number", ""),
                    "department": department,
                    "preferred_department": department,
                    "skills": [f"Assigned {role}"],
                    "reason": f"Assigned {role} sprint task by Administrator/Organizer",
                    "status": "approved",
                    "created_at": now_iso,
                    "updated_at": now_iso
                })

            # Issue notification to student
            db["notifications"].insert_one({
                "id": f"notif_{uuid.uuid4().hex[:8]}",
                "user_id": user["id"],
                "title": f"Assigned to {event_title or 'Event'}",
                "message": f"You have been assigned to event '{event_title or 'Event'}' as {role} ({department}). Task: {task_title} (Due: {due_date}).",
                "type": "task_assignment",
                "event_id": event_id,
                "task_id": task_id,
                "read": False,
                "created_at": now_iso
            })

    return real_id, real_name, real_email

class TaskService:
    @staticmethod
    def list_tasks(event_id: Optional[str] = None, assignee_id: Optional[str] = None) -> List[TaskResponse]:
        db = get_database()
        query = {}
        if event_id:
            query["event_id"] = event_id

        if assignee_id:
            or_conditions = [{"assignee_id": assignee_id}]
            user = db["users"].find_one({"id": assignee_id})
            if user:
                if user.get("email"):
                    or_conditions.append({"assignee_email": user["email"]})
                if user.get("full_name"):
                    clean_name = user["full_name"].strip()
                    or_conditions.append({"assignee_name": clean_name})
                    or_conditions.append({"assignee_name": {"$regex": f"^{re.escape(clean_name)}$", "$options": "i"}})
            query["$or"] = or_conditions

        cursor = db["tasks"].find(query).sort("due_date", 1)
        today_str = date.today().isoformat()
        results = []
        for doc in cursor:
            is_overdue = (doc.get("due_date", "") < today_str) and (doc.get("status") != "done")
            results.append(TaskResponse(
                id=doc["id"],
                title=doc["title"],
                description=doc.get("description", ""),
                event_id=doc.get("event_id"),
                event_title=doc.get("event_title"),
                department=doc.get("department") or "Operations",
                assignment_role=doc.get("assignment_role") or "Volunteer",
                assignee_id=doc.get("assignee_id"),
                assignee_name=doc.get("assignee_name"),
                assignee_email=doc.get("assignee_email"),
                due_date=doc["due_date"],
                priority=doc.get("priority", "medium"),
                is_critical_path=doc.get("is_critical_path", False),
                status=doc.get("status", "todo"),
                is_overdue=is_overdue,
                created_at=doc.get("created_at", "")
            ))
        return results

    @staticmethod
    def create_task(data: TaskCreate, current_user: dict) -> TaskResponse:
        db = get_database()
        task_id = f"tsk_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.utcnow().isoformat()

        dept = data.department or "Operations"
        role = data.assignment_role or "Volunteer"

        # Quota Validation if assigned to an event
        if data.event_id:
            if role == "Head":
                existing_heads = db["tasks"].count_documents({
                    "event_id": data.event_id,
                    "department": dept,
                    "assignment_role": "Head"
                })
                if existing_heads >= 1:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Department '{dept}' already has 1 Head assigned. Maximum limit is 1."
                    )
            elif role == "Sub-head":
                existing_subs = db["tasks"].count_documents({
                    "event_id": data.event_id,
                    "department": dept,
                    "assignment_role": "Sub-head"
                })
                if existing_subs >= 3:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Department '{dept}' already has 3 Sub-heads assigned. Maximum limit is 3."
                    )

        event_title = None
        if data.event_id:
            event = db["events"].find_one({"id": data.event_id})
            if event:
                event_title = event["title"]

        today_str = date.today().isoformat()
        is_overdue = (data.due_date < today_str) and (data.status != "done")

        # Resolve real volunteer user & sync event assignment to volunteer
        real_assignee_id, real_assignee_name, real_assignee_email = _sync_volunteer_assignment(
            db=db,
            event_id=data.event_id,
            event_title=event_title,
            assignee_id=data.assignee_id,
            assignee_name=data.assignee_name,
            assignee_email=data.assignee_email,
            department=dept,
            role=role,
            task_title=data.title,
            task_id=task_id,
            due_date=data.due_date
        )

        doc = {
            "id": task_id,
            "title": data.title,
            "description": data.description or "",
            "event_id": data.event_id,
            "event_title": event_title,
            "department": dept,
            "assignment_role": role,
            "assignee_id": real_assignee_id,
            "assignee_name": real_assignee_name,
            "assignee_email": real_assignee_email,
            "due_date": data.due_date,
            "priority": data.priority,
            "is_critical_path": data.is_critical_path,
            "status": data.status,
            "created_by": current_user["id"],
            "created_at": now_iso
        }
        db["tasks"].insert_one(doc)

        return TaskResponse(
            id=task_id,
            title=data.title,
            description=doc["description"],
            event_id=data.event_id,
            event_title=event_title,
            department=dept,
            assignment_role=role,
            assignee_id=real_assignee_id,
            assignee_name=real_assignee_name,
            assignee_email=real_assignee_email,
            due_date=data.due_date,
            priority=data.priority,
            is_critical_path=data.is_critical_path,
            status=data.status,
            is_overdue=is_overdue,
            created_at=now_iso
        )

    @staticmethod
    def update_task(task_id: str, data: TaskUpdate, current_user: dict) -> TaskResponse:
        db = get_database()
        task = db["tasks"].find_one({"id": task_id})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found.")

        target_event_id = data.event_id if hasattr(data, 'event_id') and data.event_id is not None else task.get("event_id")
        target_dept = data.department if data.department is not None else task.get("department", "Operations")
        target_role = data.assignment_role if data.assignment_role is not None else task.get("assignment_role", "Volunteer")

        if target_event_id:
            if target_role == "Head":
                existing_heads = db["tasks"].count_documents({
                    "event_id": target_event_id,
                    "department": target_dept,
                    "assignment_role": "Head",
                    "id": {"$ne": task_id}
                })
                if existing_heads >= 1:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Department '{target_dept}' already has 1 Head assigned. Maximum limit is 1."
                    )
            elif target_role == "Sub-head":
                existing_subs = db["tasks"].count_documents({
                    "event_id": target_event_id,
                    "department": target_dept,
                    "assignment_role": "Sub-head",
                    "id": {"$ne": task_id}
                })
                if existing_subs >= 3:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Department '{target_dept}' already has 3 Sub-heads assigned. Maximum limit is 3."
                    )

        update_dict = {k: v for k, v in data.dict().items() if v is not None}

        # If assignee or event is updated, sync volunteer assignment
        assignee_id_to_sync = update_dict.get("assignee_id", task.get("assignee_id"))
        assignee_name_to_sync = update_dict.get("assignee_name", task.get("assignee_name"))
        assignee_email_to_sync = update_dict.get("assignee_email", task.get("assignee_email"))

        event_title = task.get("event_title")
        if target_event_id:
            ev = db["events"].find_one({"id": target_event_id})
            if ev:
                event_title = ev["title"]
                update_dict["event_title"] = event_title

        if assignee_id_to_sync or assignee_name_to_sync:
            real_id, real_name, real_email = _sync_volunteer_assignment(
                db=db,
                event_id=target_event_id,
                event_title=event_title,
                assignee_id=assignee_id_to_sync,
                assignee_name=assignee_name_to_sync,
                assignee_email=assignee_email_to_sync,
                department=target_dept,
                role=target_role,
                task_title=update_dict.get("title", task.get("title", "")),
                task_id=task_id,
                due_date=update_dict.get("due_date", task.get("due_date", ""))
            )
            update_dict["assignee_id"] = real_id
            update_dict["assignee_name"] = real_name
            update_dict["assignee_email"] = real_email

        if update_dict:
            db["tasks"].update_one({"id": task_id}, {"$set": update_dict})

        updated = db["tasks"].find_one({"id": task_id})
        today_str = date.today().isoformat()
        is_overdue = (updated.get("due_date", "") < today_str) and (updated.get("status") != "done")

        return TaskResponse(
            id=updated["id"],
            title=updated["title"],
            description=updated.get("description", ""),
            event_id=updated.get("event_id"),
            event_title=updated.get("event_title"),
            department=updated.get("department") or "Operations",
            assignment_role=updated.get("assignment_role") or "Volunteer",
            assignee_id=updated.get("assignee_id"),
            assignee_name=updated.get("assignee_name"),
            assignee_email=updated.get("assignee_email"),
            due_date=updated["due_date"],
            priority=updated.get("priority", "medium"),
            is_critical_path=updated.get("is_critical_path", False),
            status=updated.get("status", "todo"),
            is_overdue=is_overdue,
            created_at=updated.get("created_at", "")
        )

    @staticmethod
    def get_department_assignments(event_id: Optional[str] = None) -> dict:
        db = get_database()
        query = {}
        event_info = None
        if event_id:
            query["event_id"] = event_id
            ev_doc = db["events"].find_one({"id": event_id})
            if ev_doc:
                event_info = {
                    "id": ev_doc["id"],
                    "title": ev_doc["title"],
                    "event_date": ev_doc.get("event_date", ""),
                    "venue": ev_doc.get("venue", "")
                }

        tasks = list(db["tasks"].find(query))

        departments_data = []
        for dept in DEPARTMENTS:
            dept_tasks = [t for t in tasks if (t.get("department") or "Operations").lower() == dept.lower()]

            heads = []
            sub_heads = []
            volunteers = []

            for t in dept_tasks:
                assignee = {
                    "task_id": t["id"],
                    "task_title": t["title"],
                    "assignee_name": t.get("assignee_name") or "Unassigned",
                    "due_date": t.get("due_date", ""),
                    "status": t.get("status", "todo"),
                    "priority": t.get("priority", "medium"),
                    "is_critical_path": t.get("is_critical_path", False)
                }
                role = t.get("assignment_role") or "Volunteer"
                if role == "Head":
                    heads.append(assignee)
                elif role == "Sub-head":
                    sub_heads.append(assignee)
                else:
                    volunteers.append(assignee)

            departments_data.append({
                "department": dept,
                "head_quota": 1,
                "sub_head_quota": 3,
                "head_assigned": len(heads),
                "sub_head_assigned": len(sub_heads),
                "volunteer_assigned": len(volunteers),
                "head_remaining": max(0, 1 - len(heads)),
                "sub_head_remaining": max(0, 3 - len(sub_heads)),
                "heads": heads,
                "sub_heads": sub_heads,
                "volunteers": volunteers,
                "total_members": len(heads) + len(sub_heads) + len(volunteers)
            })

        return {
            "event": event_info,
            "event_id": event_id,
            "departments": departments_data
        }
