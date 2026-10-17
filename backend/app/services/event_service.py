import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException
from app.database.mongodb import get_database
from app.schemas.event import EventCreate, EventUpdate, EventResponse

class EventService:
    @staticmethod
    def list_events(is_published_only: Optional[bool] = None) -> List[EventResponse]:
        db = get_database()
        query = {}
        if is_published_only is True:
            query["is_published"] = True
        elif is_published_only is False:
            query["is_published"] = False
        
        cursor = db["events"].find(query).sort("event_date", 1)
        results = []
        for doc in cursor:
            results.append(EventResponse(
                id=doc["id"],
                title=doc["title"],
                description=doc.get("description", ""),
                venue=doc["venue"],
                event_date=doc["event_date"],
                end_date=doc.get("end_date"),
                capacity=doc["capacity"],
                booked_count=doc.get("booked_count", 0),
                checked_in_count=doc.get("checked_in_count", 0),
                member_price_paise=doc["member_price_paise"],
                non_member_price_paise=doc["non_member_price_paise"],
                banner_url=doc.get("banner_url"),
                tags=doc.get("tags", []),
                is_published=doc.get("is_published", True),
                is_ended=doc.get("is_ended", False),
                status=doc.get("status", "ended" if doc.get("is_ended") else "upcoming"),
                ended_at=doc.get("ended_at"),
                required_volunteer_count=doc.get("required_volunteer_count", 5),
                estimated_budget_paise=doc.get("estimated_budget_paise", 2000000),
                created_at=doc.get("created_at", "")
            ))
        return results

    @staticmethod
    def get_event(event_id: str, current_user: Optional[dict] = None) -> EventResponse:
        db = get_database()
        doc = db["events"].find_one({"id": event_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Event not found.")

        return EventResponse(
            id=doc["id"],
            title=doc["title"],
            description=doc.get("description", ""),
            venue=doc["venue"],
            event_date=doc["event_date"],
            end_date=doc.get("end_date"),
            capacity=doc["capacity"],
            booked_count=doc.get("booked_count", 0),
            checked_in_count=doc.get("checked_in_count", 0),
            member_price_paise=doc["member_price_paise"],
            non_member_price_paise=doc["non_member_price_paise"],
            banner_url=doc.get("banner_url"),
            tags=doc.get("tags", []),
            is_published=doc.get("is_published", True),
            is_ended=doc.get("is_ended", False),
            status=doc.get("status", "ended" if doc.get("is_ended") else "upcoming"),
            ended_at=doc.get("ended_at"),
            required_volunteer_count=doc.get("required_volunteer_count", 5),
            estimated_budget_paise=doc.get("estimated_budget_paise", 2000000),
            created_at=doc.get("created_at", "")
        )

    @staticmethod
    def create_event(data: EventCreate, current_user: dict) -> EventResponse:
        db = get_database()
        event_id = f"evt_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.utcnow().isoformat()
        
        event_doc = {
            "id": event_id,
            "title": data.title,
            "description": data.description or "",
            "venue": data.venue,
            "event_date": data.event_date,
            "end_date": data.end_date,
            "capacity": data.capacity,
            "booked_count": 0,
            "checked_in_count": 0,
            "member_price_paise": data.member_price_paise,
            "non_member_price_paise": data.non_member_price_paise,
            "banner_url": data.banner_url,
            "tags": data.tags,
            "is_published": data.is_published,
            "is_ended": data.is_ended,
            "status": data.status or "upcoming",
            "required_volunteer_count": data.required_volunteer_count,
            "estimated_budget_paise": data.estimated_budget_paise,
            "created_by": current_user.get("id"),
            "created_at": now_iso
        }
        db["events"].insert_one(event_doc)

        # Broadcast notification and chapter announcement if published
        if event_doc.get("is_published"):
            try:
                from app.services.notification_service import create_notification
                create_notification(
                    title=f"New Event: {event_doc['title']}",
                    message=f"Registration and ticketing for {event_doc['title']} ({event_doc['venue']}) are now open for all students and chapter members!",
                    category="event",
                    severity="info",
                    target_roles=["student", "admin", "treasurer", "organizer"],
                    deduplication_key=f"event_publish_{event_id}",
                    related_entity_type="event",
                    related_entity_id=event_id,
                    target_route="/events"
                )
            except Exception as notif_err:
                print(f"Notice: Notification broadcast skipped: {notif_err}")

            try:
                ann_id = f"ann_{uuid.uuid4().hex[:10]}"
                db["announcements"].insert_one({
                    "id": ann_id,
                    "title": f"🎉 New Event: {event_doc['title']}",
                    "content": event_doc.get("description") or f"Registration is now open for {event_doc['title']} taking place at {event_doc['venue']} on {event_doc['event_date']}.",
                    "target_audience": "all",
                    "priority": "normal",
                    "is_published": True,
                    "author_id": current_user.get("id", "organizer"),
                    "author_name": current_user.get("full_name", "Chapter Executive"),
                    "created_at": now_iso,
                    "updated_at": now_iso
                })
            except Exception as ann_err:
                print(f"Notice: Announcement creation skipped: {ann_err}")

        return EventResponse(
            id=event_doc["id"],
            title=event_doc["title"],
            description=event_doc.get("description", ""),
            venue=event_doc["venue"],
            event_date=event_doc["event_date"],
            end_date=event_doc.get("end_date"),
            capacity=event_doc["capacity"],
            booked_count=0,
            checked_in_count=0,
            member_price_paise=event_doc["member_price_paise"],
            non_member_price_paise=event_doc["non_member_price_paise"],
            banner_url=event_doc.get("banner_url"),
            tags=event_doc.get("tags", []),
            is_published=event_doc.get("is_published", True),
            is_ended=event_doc.get("is_ended", False),
            status=event_doc.get("status", "upcoming"),
            ended_at=None,
            required_volunteer_count=event_doc.get("required_volunteer_count", 5),
            estimated_budget_paise=event_doc.get("estimated_budget_paise", 2000000),
            created_at=event_doc.get("created_at", "")
        )

    @staticmethod
    def update_event(event_id: str, data: EventUpdate) -> EventResponse:
        db = get_database()
        event = db["events"].find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found.")
        
        if hasattr(data, "model_dump"):
            update_data = data.model_dump(exclude_unset=True)
        else:
            update_data = data.dict(exclude_unset=True)
        
        if update_data:
            db["events"].update_one({"id": event_id}, {"$set": update_data})
        
        updated = db["events"].find_one({"id": event_id})

        # Broadcast when an event transitions to published
        was_published = event.get("is_published", False)
        is_now_published = updated.get("is_published", False)
        if not was_published and is_now_published:
            try:
                from app.services.notification_service import create_notification
                create_notification(
                    title=f"Event Published: {updated['title']}",
                    message=f"Registration and ticketing for {updated['title']} are now live for all students!",
                    category="event",
                    severity="info",
                    target_roles=["student", "admin", "treasurer", "organizer"],
                    deduplication_key=f"event_publish_{event_id}_{int(datetime.utcnow().timestamp())}",
                    related_entity_type="event",
                    related_entity_id=event_id,
                    target_route="/events"
                )
            except Exception:
                pass

        return EventResponse(
            id=updated["id"],
            title=updated["title"],
            description=updated.get("description", ""),
            venue=updated["venue"],
            event_date=updated["event_date"],
            end_date=updated.get("end_date"),
            capacity=updated["capacity"],
            booked_count=updated.get("booked_count", 0),
            checked_in_count=updated.get("checked_in_count", 0),
            member_price_paise=updated.get("member_price_paise", 0),
            non_member_price_paise=updated.get("non_member_price_paise", 10000),
            banner_url=updated.get("banner_url"),
            tags=updated.get("tags", []),
            is_published=updated.get("is_published", True),
            is_ended=updated.get("is_ended", False),
            status=updated.get("status", "ended" if updated.get("is_ended") else "upcoming"),
            ended_at=updated.get("ended_at"),
            required_volunteer_count=updated.get("required_volunteer_count", 5),
            estimated_budget_paise=updated.get("estimated_budget_paise", 2000000),
            created_at=updated.get("created_at", "")
        )

    @staticmethod
    def delete_event(event_id: str) -> dict:
        db = get_database()
        event = db["events"].find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found.")
        db["events"].delete_one({"id": event_id})
        return {"message": "Event cancelled successfully", "id": event_id}
