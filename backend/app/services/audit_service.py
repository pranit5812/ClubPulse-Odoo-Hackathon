import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from app.database.mongodb import get_database
from app.schemas.audit import AuditLogItem, AuditLogResponse

def record_audit_log(
    user_email: str,
    user_role: str,
    action: str,
    entity_type: str,
    entity_id: str,
    summary: str,
    payload: Optional[Dict[str, Any]] = None
) -> AuditLogItem:
    db = get_database()
    log_doc = {
        "id": str(uuid.uuid4()),
        "user_email": user_email,
        "user_role": user_role,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "summary": summary,
        "payload": payload or {},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db["audit_logs"].insert_one(log_doc)
    return AuditLogItem(
        id=log_doc["id"],
        user_email=log_doc["user_email"],
        user_role=log_doc["user_role"],
        action=log_doc["action"],
        entity_type=log_doc["entity_type"],
        entity_id=log_doc["entity_id"],
        summary=log_doc["summary"],
        payload=log_doc["payload"],
        created_at=log_doc["created_at"]
    )

def list_audit_logs(limit: int = 50, skip: int = 0) -> AuditLogResponse:
    db = get_database()
    total = db["audit_logs"].count_documents({})
    cursor = db["audit_logs"].find({}).sort("created_at", -1).skip(skip).limit(limit)
    items: List[AuditLogItem] = []
    for doc in cursor:
        items.append(AuditLogItem(
            id=str(doc.get("id") or doc.get("_id")),
            user_email=doc.get("user_email", "system"),
            user_role=doc.get("user_role", "system"),
            action=doc.get("action", ""),
            entity_type=doc.get("entity_type", ""),
            entity_id=doc.get("entity_id", ""),
            summary=doc.get("summary", ""),
            payload=doc.get("payload", {}),
            created_at=doc.get("created_at", "")
        ))
    return AuditLogResponse(total=total, logs=items)
