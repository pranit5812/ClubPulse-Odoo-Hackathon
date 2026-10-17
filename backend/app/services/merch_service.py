import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from app.database.mongodb import get_database
from app.schemas.merch import ProductCreate, ProductUpdate, ProductResponse, OrderCreate, OrderResponse, SizeStock

class MerchService:
    @staticmethod
    def list_products() -> List[ProductResponse]:
        db = get_database()
        cursor = db["products"].find().sort("name", 1)
        results = []
        for doc in cursor:
            sizes = [SizeStock(size=s["size"], stock=s["stock"]) for s in doc.get("sizes", [])]
            total_stock = sum(s.stock for s in sizes)
            results.append(ProductResponse(
                id=doc["id"],
                name=doc["name"],
                description=doc["description"],
                brand=doc.get("brand", "Competition Edition"),
                price_paise=doc["price_paise"],
                category=doc.get("category", "General"),
                image_url=doc.get("image_url"),
                sizes=sizes,
                sku=doc["sku"],
                total_stock=total_stock,
                is_available=total_stock > 0,
                created_at=doc.get("created_at", "")
            ))
        return results

    @staticmethod
    def update_product(product_id: str, data: ProductUpdate) -> ProductResponse:
        db = get_database()
        product = db["products"].find_one({"id": product_id})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found.")

        if hasattr(data, "model_dump"):
            update_data = data.model_dump(exclude_unset=True)
        else:
            update_data = data.dict(exclude_unset=True)

        if "sizes" in update_data and update_data["sizes"] is not None:
            update_data["sizes"] = [
                {
                    "size": s.size if hasattr(s, "size") else s["size"],
                    "stock": s.stock if hasattr(s, "stock") else s["stock"]
                }
                for s in update_data["sizes"]
            ]

        if update_data:
            db["products"].update_one({"id": product_id}, {"$set": update_data})

        updated = db["products"].find_one({"id": product_id})
        sizes = [SizeStock(size=s["size"], stock=s["stock"]) for s in updated.get("sizes", [])]
        total_stock = sum(s.stock for s in sizes)
        return ProductResponse(
            id=updated["id"],
            name=updated["name"],
            description=updated["description"],
            brand=updated.get("brand", "Competition Edition"),
            price_paise=updated["price_paise"],
            category=updated.get("category", "General"),
            image_url=updated.get("image_url"),
            sizes=sizes,
            sku=updated["sku"],
            total_stock=total_stock,
            is_available=total_stock > 0,
            created_at=updated.get("created_at", "")
        )

    @staticmethod
    def create_product(data: ProductCreate) -> ProductResponse:
        db = get_database()
        existing = db["products"].find_one({"sku": data.sku.upper()})
        if existing:
            raise HTTPException(status_code=409, detail=f"Product with SKU '{data.sku}' already exists.")
        
        prod_id = f"prd_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.utcnow().isoformat()
        
        sizes_dicts = [{"size": s.size, "stock": s.stock} for s in data.sizes]
        total_stock = sum(s.stock for s in data.sizes)

        prod_doc = {
            "id": prod_id,
            "name": data.name,
            "brand": data.brand or "Competition Edition",
            "description": data.description,
            "price_paise": data.price_paise,
            "category": data.category,
            "image_url": data.image_url,
            "sizes": sizes_dicts,
            "sku": data.sku.upper(),
            "created_at": now_iso
        }
        db["products"].insert_one(prod_doc)

        return ProductResponse(
            id=prod_id,
            name=data.name,
            brand=prod_doc["brand"],
            description=data.description,
            price_paise=data.price_paise,
            category=data.category,
            image_url=data.image_url,
            sizes=data.sizes,
            sku=data.sku.upper(),
            total_stock=total_stock,
            is_available=total_stock > 0,
            created_at=now_iso
        )

    @staticmethod
    def delete_product(product_id: str) -> dict:
        db = get_database()
        product = db["products"].find_one({"id": product_id})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found.")
        db["products"].delete_one({"id": product_id})
        return {"message": "Product deleted successfully", "id": product_id}

    @staticmethod
    def create_order(data: OrderCreate, current_user: dict) -> OrderResponse:
        db = get_database()
        if not data.items:
            raise HTTPException(status_code=400, detail="Order items cannot be empty.")

        total_amount_paise = 0
        order_items_detailed = []

        # Validate and reserve stock atomically
        for item in data.items:
            product = db["products"].find_one({"id": item.product_id})
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found.")

            # Attempt atomic stock decrement for the specific size
            res = db["products"].update_one(
                {
                    "id": item.product_id,
                    "sizes": {
                        "$elemMatch": {
                            "size": item.size,
                            "stock": {"$gte": item.quantity}
                        }
                    }
                },
                {"$inc": {"sizes.$.stock": -item.quantity}}
            )

            if res.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for {product['name']} (Size {item.size})."
                )

            item_total = product["price_paise"] * item.quantity
            total_amount_paise += item_total
            order_items_detailed.append({
                "product_id": product["id"],
                "product_name": product["name"],
                "size": item.size,
                "quantity": item.quantity,
                "price_paise": product["price_paise"],
                "item_total_paise": item_total
            })

        order_id = f"ord_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.utcnow().isoformat()

        order_doc = {
            "id": order_id,
            "user_id": current_user["id"],
            "user_name": current_user["full_name"],
            "user_email": current_user["email"],
            "items": order_items_detailed,
            "total_amount_paise": total_amount_paise,
            "status": "placed",
            "payment_status": "paid",
            "delivery_notes": data.delivery_notes,
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature,
            "created_at": now_iso
        }
        db["orders"].insert_one(order_doc)

        # Record income in financial ledger
        db["transactions"].insert_one({
            "id": f"txn_{uuid.uuid4().hex[:10]}",
            "amount_paise": total_amount_paise,
            "transaction_type": "income",
            "category": "merchandise",
            "description": f"Merchandise order #{order_id[-6:]} by {current_user['full_name']}",
            "status": "completed",
            "reference_id": order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_order_id": data.razorpay_order_id,
            "created_at": now_iso,
            "created_by": current_user["id"]
        })

        return OrderResponse(**{k: v for k, v in order_doc.items() if k != "_id"})

    @staticmethod
    def list_orders(user_id: Optional[str] = None) -> List[OrderResponse]:
        db = get_database()
        query = {"user_id": user_id} if user_id else {}
        cursor = db["orders"].find(query).sort("created_at", -1)
        results = []
        for doc in cursor:
            results.append(OrderResponse(
                id=doc["id"],
                user_id=doc["user_id"],
                user_name=doc["user_name"],
                user_email=doc["user_email"],
                items=doc.get("items", []),
                total_amount_paise=doc["total_amount_paise"],
                status=doc.get("status", "placed"),
                payment_status=doc.get("payment_status", "paid"),
                delivery_notes=doc.get("delivery_notes"),
                created_at=doc.get("created_at", "")
            ))
        return results
