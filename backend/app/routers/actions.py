from fastapi import APIRouter, Depends, HTTPException
from app.schemas.action_center import ActionCenterSummary, ActionItem, ActionItemUpdateRequest
from app.services.action_service import get_action_center_items, update_action_item
from app.core.dependencies import require_roles

router = APIRouter(prefix="/api/action-center", tags=["Action Center"])

@router.get("/items", response_model=ActionCenterSummary)
def list_action_items(
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return get_action_center_items()

@router.patch("/items/{item_id}", response_model=ActionItem)
def update_action(
    item_id: str,
    payload: ActionItemUpdateRequest,
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    res = update_action_item(
        item_id=item_id,
        update_data=payload,
        user_email=current_user.get("email", "unknown"),
        user_role=current_user.get("role", "organizer")
    )
    if not res:
        raise HTTPException(status_code=404, detail="Action item not found")
    return res
