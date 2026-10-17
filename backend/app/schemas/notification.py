from typing import List, Optional
from pydantic import BaseModel

class NotificationItem(BaseModel):
    id: str
    title: str
    message: str
    category: str  # readiness, capacity, financial, task, inventory
    severity: str  # info, warning, critical
    target_roles: List[str]  # e.g., ["organizer", "treasurer", "admin"]
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    target_route: Optional[str] = None
    is_read: bool = False
    deduplication_key: str
    created_at: str

class NotificationSummary(BaseModel):
    unread_count: int
    notifications: List[NotificationItem]
