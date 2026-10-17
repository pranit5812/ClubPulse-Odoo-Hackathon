from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.readiness import EventReadinessDetail, EventReadinessSummary
from app.services.readiness_service import calculate_event_readiness, list_events_readiness_summary
from app.core.dependencies import require_roles

router = APIRouter(prefix="/api/readiness", tags=["Event Readiness Engine"])

@router.get("/events", response_model=List[EventReadinessSummary])
def get_all_events_readiness(
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return list_events_readiness_summary()

@router.get("/events/{event_id}", response_model=EventReadinessDetail)
def get_event_readiness(
    event_id: str,
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    detail = calculate_event_readiness(event_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Event not found")
    return detail
