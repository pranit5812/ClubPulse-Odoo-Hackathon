from typing import List, Optional
from pydantic import BaseModel, Field

class SizeStock(BaseModel):
    size: str  # e.g., 'XS', 'S', 'M', 'L', 'XL', 'Standard'
    stock: int = Field(default=0, ge=0)

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2)
    description: str
    price_paise: int = Field(..., gt=0)
    brand: Optional[str] = "Competition Edition"
    category: str = "Hoodies"  # Hoodies, T-Shirts, Jackets, Stickers
    image_url: Optional[str] = None
    sizes: List[SizeStock]
    sku: str

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    price_paise: Optional[int] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    sizes: Optional[List[SizeStock]] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    brand: Optional[str] = "Competition Edition"
    description: str
    price_paise: int
    category: str
    image_url: Optional[str] = None
    sizes: List[SizeStock]
    sku: str
    total_stock: int
    is_available: bool
    created_at: str

class OrderItem(BaseModel):
    product_id: str
    size: str
    quantity: int = Field(default=1, ge=1)

class OrderCreate(BaseModel):
    items: List[OrderItem]
    delivery_notes: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    items: List[dict]
    total_amount_paise: int
    status: str  # placed, processing, fulfilled, cancelled
    payment_status: str  # paid, pending, refunded
    delivery_notes: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: str
