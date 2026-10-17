from typing import List
from fastapi import APIRouter, Depends
from app.schemas.merch import OrderCreate, OrderResponse
from app.services.merch_service import MerchService
from app.core.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/api/orders", tags=["Orders"])

@router.post("", response_model=OrderResponse)
def create_order(
    data: OrderCreate,
    current_user: dict = Depends(get_current_user)
):
    return MerchService.create_order(data, current_user=current_user)

@router.get("/my-orders", response_model=List[OrderResponse])
def get_my_orders(current_user: dict = Depends(get_current_user)):
    return MerchService.list_orders(user_id=current_user["id"])

@router.get("", response_model=List[OrderResponse])
def list_all_orders(
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return MerchService.list_orders()
