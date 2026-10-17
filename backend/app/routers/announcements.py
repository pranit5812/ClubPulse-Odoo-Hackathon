from typing import List
from fastapi import APIRouter, Depends
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse
from app.services.announcement_service import AnnouncementService
from app.core.dependencies import get_optional_current_user, require_roles

router = APIRouter(prefix="/api/announcements", tags=["Announcements"])

@router.get("", response_model=List[AnnouncementResponse])
def list_announcements(current_user: dict = Depends(get_optional_current_user)):
    return AnnouncementService.list_announcements(current_user=current_user)

@router.post("", response_model=AnnouncementResponse)
def create_announcement(
    data: AnnouncementCreate,
    current_user: dict = Depends(require_roles(["organizer", "admin"]))
):
    return AnnouncementService.create_announcement(data, current_user=current_user)

@router.patch("/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement(
    announcement_id: str,
    data: AnnouncementUpdate,
    current_user: dict = Depends(require_roles(["organizer", "admin"]))
):
    return AnnouncementService.update_announcement(announcement_id, data, current_user=current_user)

@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    current_user: dict = Depends(require_roles(["organizer", "admin"]))
):
    return AnnouncementService.delete_announcement(announcement_id, current_user=current_user)

