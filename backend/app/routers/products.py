from typing import List
from fastapi import APIRouter, Depends
from app.schemas.merch import ProductCreate, ProductUpdate, ProductResponse
from app.services.merch_service import MerchService
from app.core.dependencies import require_roles

router = APIRouter(prefix="/api/products", tags=["Merchandise Products"])

@router.get("", response_model=List[ProductResponse])
def list_products():
    return MerchService.list_products()

@router.post("", response_model=ProductResponse)
def create_product(
    data: ProductCreate,
    current_user: dict = Depends(require_roles(["organizer", "admin"]))
):
    return MerchService.create_product(data)

@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    data: ProductUpdate,
    current_user: dict = Depends(require_roles(["organizer", "admin"]))
):
    return MerchService.update_product(product_id, data)

@router.delete("/{product_id}")
def delete_product(
    product_id: str,
    current_user: dict = Depends(require_roles(["organizer", "admin"]))
):
    return MerchService.delete_product(product_id)

