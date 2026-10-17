from fastapi import APIRouter, Depends, HTTPException
from app.schemas.notification import NotificationSummary
from app.services.notification_service import (
    list_notifications, mark_notification_read, mark_all_notifications_read
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["In-App Operational Notifications"])

@router.get("", response_model=NotificationSummary)
def get_user_notifications(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role", "student")
    return list_notifications(role)

@router.patch("/{notification_id}/read")
def read_notification(notification_id: str, current_user: dict = Depends(get_current_user)):
    success = mark_notification_read(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "id": notification_id}

@router.post("/mark-all-read")
def read_all(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role", "student")
    count = mark_all_notifications_read(role)
    return {"success": True, "marked_count": count}
