import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException, status
from app.database.mongodb import get_database
from app.schemas.member import MemberCreate, MemberUpdate, MemberRenew, MemberResponse

class MemberService:
    @staticmethod
    def list_members(status_filter: Optional[str] = None, search: Optional[str] = None) -> List[MemberResponse]:
        db = get_database()
        query = {}
        if status_filter and status_filter != "all":
            query["status"] = status_filter
        if search:
            query["$or"] = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"roll_number": {"$regex": search, "$options": "i"}}
            ]
        
        cursor = db["members"].find(query).sort("created_at", -1)
        results = []
        for doc in cursor:
            results.append(MemberResponse(
                id=doc["id"],
                user_id=doc.get("user_id"),
                full_name=doc["full_name"],
                email=doc["email"],
                roll_number=doc["roll_number"],
                phone=doc.get("phone"),
                department=doc.get("department"),
                status=doc["status"],
                membership_type=doc.get("membership_type", "annual"),
                start_date=doc.get("start_date", ""),
                expiry_date=doc.get("expiry_date", ""),
                dues_paid_paise=doc.get("dues_paid_paise", 0),
                created_at=doc.get("created_at", "")
            ))
        return results

    @staticmethod
    def create_member(data: MemberCreate, current_user: Optional[dict] = None) -> MemberResponse:
        db = get_database()
        existing = db["members"].find_one({"email": data.email.lower()})
        if existing and existing.get("status") == "active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Member with email {data.email} already exists."
            )
        
        now = datetime.utcnow()
        now_iso = now.isoformat()
        
        # Valid for 365 days if annual, 180 if semester
        days = 365 if data.membership_type == "annual" else 180
        expiry = (now + timedelta(days=days)).isoformat()
        
        user_id = current_user.get("id") if current_user else None
        # Check if existing user account matches
        if not user_id:
            user_acc = db["users"].find_one({"email": data.email.lower()})
            if user_acc:
                user_id = user_acc["id"]

        member_status = "active" if data.dues_paid_paise > 0 else "pending"

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A membership profile with this email already exists."
            )

        member_id = f"mem_{uuid.uuid4().hex[:10]}"
        member_doc = {
            "id": member_id,
            "user_id": user_id,
            "full_name": data.full_name,
            "email": data.email.lower(),
            "roll_number": data.roll_number,
            "phone": data.phone,
            "department": data.department,
            "status": member_status,
            "membership_type": data.membership_type,
            "start_date": now_iso,
            "expiry_date": expiry,
            "dues_paid_paise": data.dues_paid_paise,
            "created_at": now_iso
        }
        db["members"].insert_one(member_doc)

        # Update linked user account if present
        if user_id and member_status == "active":
            db["users"].update_one(
                {"id": user_id},
                {"$set": {"membership_status": "active", "membership_expiry": expiry}}
            )

        # Record financial income if dues were paid
        if data.dues_paid_paise > 0:
            db["transactions"].insert_one({
                "id": f"txn_{uuid.uuid4().hex[:10]}",
                "amount_paise": data.dues_paid_paise,
                "transaction_type": "income",
                "category": "membership_dues",
                "description": f"{data.membership_type.capitalize()} membership dues for {data.full_name} ({data.roll_number})",
                "status": "completed",
                "reference_id": member_id,
                "created_at": now_iso,
                "created_by": user_id or "system"
            })

        updated = db["members"].find_one({"id": member_id})
        return MemberResponse(**{k: v for k, v in updated.items() if k != "_id"})

    @staticmethod
    def renew_membership(member_id: str, data: MemberRenew) -> MemberResponse:
        db = get_database()
        member = db["members"].find_one({
            "$or": [{"id": member_id}, {"user_id": member_id}, {"email": member_id.lower()}]
        })
        if not member:
            # Check if user account exists
            user_acc = db["users"].find_one({"$or": [{"id": member_id}, {"email": member_id.lower()}]})
            if user_acc:
                # Create member record for this user
                member_id_new = f"mem_{uuid.uuid4().hex[:10]}"
                db["members"].insert_one({
                    "id": member_id_new,
                    "user_id": user_acc["id"],
                    "full_name": user_acc["full_name"],
                    "email": user_acc["email"].lower(),
                    "roll_number": user_acc.get("roll_number", "STU-2026-001"),
                    "status": "active",
                    "membership_type": "annual" if data.duration_months >= 12 else "semester",
                    "start_date": datetime.utcnow().isoformat(),
                    "expiry_date": (datetime.utcnow() + timedelta(days=data.duration_months * 30)).isoformat(),
                    "dues_paid_paise": 50000 if data.duration_months >= 12 else 30000,
                    "created_at": datetime.utcnow().isoformat()
                })
                member = db["members"].find_one({"id": member_id_new})
            else:
                raise HTTPException(status_code=404, detail="Member profile not found.")
        
        now = datetime.utcnow()
        days_to_add = data.duration_months * 30
        new_expiry = (now + timedelta(days=days_to_add)).isoformat()
        renewal_fee_paise = 50000 if data.duration_months >= 12 else 30000
        
        db["members"].update_one(
            {"id": member["id"]},
            {
                "$set": {
                    "status": "active",
                    "expiry_date": new_expiry,
                    "membership_type": "annual" if data.duration_months >= 12 else "semester"
                },
                "$inc": {"dues_paid_paise": renewal_fee_paise}
            }
        )

        # Update linked user
        user_id = member.get("user_id")
        if user_id:
            db["users"].update_one(
                {"id": user_id},
                {"$set": {"membership_status": "active", "membership_expiry": new_expiry}}
            )
        
        # Record financial ledger entry (treasurer / admin)
        db["transactions"].insert_one({
            "id": f"txn_{uuid.uuid4().hex[:10]}",
            "amount_paise": renewal_fee_paise,
            "transaction_type": "income",
            "category": "membership_dues",
            "description": f"Membership renewal ({data.duration_months} months) for {member['full_name']}",
            "status": "completed",
            "reference_id": f"renew_{member['id']}_{int(now.timestamp())}",
            "created_at": now.isoformat(),
            "created_by": user_id or "system"
        })

        updated = db["members"].find_one({"id": member["id"]})
        return MemberResponse(**{k: v for k, v in updated.items() if k != "_id"})
