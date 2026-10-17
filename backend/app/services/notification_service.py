import uuid
from datetime import datetime, timezone
from typing import List, Optional
from app.database.mongodb import get_database
from app.schemas.notification import NotificationItem, NotificationSummary

def create_notification(
    title: str,
    message: str,
    category: str,
    severity: str,
    target_roles: List[str],
    deduplication_key: str,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    target_route: Optional[str] = None
) -> Optional[NotificationItem]:
    db = get_database()
    # Deduplication check: if an unread notification with this deduplication_key exists, skip
    existing = db["notifications"].find_one({
        "deduplication_key": deduplication_key,
        "is_read": False
    })
    if existing:
        return None

    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "title": title,
        "message": message,
        "category": category,
        "severity": severity,
        "target_roles": target_roles,
        "related_entity_type": related_entity_type,
        "related_entity_id": related_entity_id,
        "target_route": target_route,
        "is_read": False,
        "deduplication_key": deduplication_key,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db["notifications"].insert_one(doc)
    return NotificationItem(
        id=doc["id"],
        title=doc["title"],
        message=doc["message"],
        category=doc["category"],
        severity=doc["severity"],
        target_roles=doc["target_roles"],
        related_entity_type=doc["related_entity_type"],
        related_entity_id=doc["related_entity_id"],
        target_route=doc["target_route"],
        is_read=doc["is_read"],
        deduplication_key=doc["deduplication_key"],
        created_at=doc["created_at"]
    )

def list_notifications(role: str) -> NotificationSummary:
    db = get_database()
    query = {
        "$or": [
            {"target_roles": role},
            {"target_roles": "all"}
        ]
    }
    cursor = db["notifications"].find(query).sort("created_at", -1).limit(50)
    items: List[NotificationItem] = []
    unread_count = 0
    for doc in cursor:
        is_read = doc.get("is_read", False)
        if not is_read:
            unread_count += 1
        items.append(NotificationItem(
            id=str(doc.get("id") or doc.get("_id")),
            title=doc.get("title", ""),
            message=doc.get("message", ""),
            category=doc.get("category", "info"),
            severity=doc.get("severity", "info"),
            target_roles=doc.get("target_roles", ["all"]),
            related_entity_type=doc.get("related_entity_type"),
            related_entity_id=doc.get("related_entity_id"),
            target_route=doc.get("target_route"),
            is_read=is_read,
            deduplication_key=doc.get("deduplication_key", ""),
            created_at=doc.get("created_at", "")
        ))
    return NotificationSummary(unread_count=unread_count, notifications=items)

def mark_notification_read(notification_id: str) -> bool:
    db = get_database()
    res = db["notifications"].update_one(
        {"$or": [{"id": notification_id}, {"_id": notification_id}]},
        {"$set": {"is_read": True}}
    )
    return res.modified_count > 0

def mark_all_notifications_read(role: str) -> int:
    db = get_database()
    query = {
        "is_read": False,
        "$or": [
            {"target_roles": role},
            {"target_roles": "all"}
        ]
    }
    res = db["notifications"].update_many(query, {"$set": {"is_read": True}})
    return res.modified_count
