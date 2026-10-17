from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.schemas.member import MemberCreate, MemberUpdate, MemberRenew, MemberResponse
from app.services.member_service import MemberService
from app.core.dependencies import get_current_user, get_optional_current_user, require_roles
from app.database.mongodb import get_database
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/members", tags=["Memberships"])

@router.get("", response_model=List[MemberResponse])
def list_members(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return MemberService.list_members(status_filter=status, search=search)

@router.post("", response_model=MemberResponse)
def create_member(data: MemberCreate, current_user: Optional[dict] = Depends(get_optional_current_user)):
    return MemberService.create_member(data, current_user=current_user)

@router.post("/{member_id}/renew", response_model=MemberResponse)
def renew_member(
    member_id: str,
    data: MemberRenew,
    current_user: dict = Depends(get_current_user)
):
    return MemberService.renew_membership(member_id, data)

@router.get("/expiring-summary")
def get_expiring_summary(
    days_threshold: int = Query(30),
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    db = get_database()
    now = datetime.now(timezone.utc)
    threshold_date = (now + timedelta(days=days_threshold)).isoformat()
    now_iso = now.isoformat()
    
    cursor = db["members"].find({"status": {"$in": ["active", "expired"]}})
    expiring_members = []
    expired_count = 0
    
    for doc in cursor:
        exp = doc.get("expiry_date") or doc.get("valid_until") or ""
        if exp:
            if exp < now_iso:
                expired_count += 1
            elif exp <= threshold_date:
                expiring_members.append({
                    "id": doc["id"],
                    "full_name": doc["full_name"],
                    "email": doc["email"],
                    "expiry_date": exp
                })
                
    return {
        "expiring_count": len(expiring_members),
        "expired_count": expired_count,
        "expiring_members": expiring_members
    }

@router.post("/{member_id}/send-renewal-notice")
def send_renewal_notice(
    member_id: str,
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    db = get_database()
    member = db["members"].find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
        
    exp = member.get("expiry_date") or member.get("valid_until") or "soon"
    date_str = exp[:10] if len(exp) >= 10 else exp

    create_notification(
        title="⚠️ Action Required: Renew Your Club Membership",
        message=f"Hello {member['full_name']}, your chapter membership validity is expiring on {date_str}. Renew now to preserve your event discounts, voting eligibility, and perks.",
        category="membership",
        severity="warning",
        target_roles=["student", "user"],
        deduplication_key=f"renew_notice_{member['id']}_{datetime.now().strftime('%Y%m%d%H%M')}",
        related_entity_type="membership",
        related_entity_id=member["id"],
        target_route="/membership"
    )
    
    return {
        "success": True,
        "message": f"Renewal notification successfully dispatched to {member['full_name']}."
    }

@router.post("/send-bulk-renewal-notices")
def send_bulk_renewal_notices(
    days_threshold: int = Query(30),
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    db = get_database()
    now = datetime.now(timezone.utc)
    threshold_date = (now + timedelta(days=days_threshold)).isoformat()
    
    cursor = db["members"].find({"status": {"$in": ["active", "expired"]}})
    notified_names = []
    
    for doc in cursor:
        exp = doc.get("expiry_date") or doc.get("valid_until") or ""
        if not exp or exp <= threshold_date:
            date_str = exp[:10] if len(exp) >= 10 else "soon"
            create_notification(
                title="⚠️ Action Required: Membership Renewal",
                message=f"Hello {doc['full_name']}, your chapter membership is on the verge of expiring ({date_str}). Please renew now to maintain active status.",
                category="membership",
                severity="warning",
                target_roles=["student", "user"],
                deduplication_key=f"bulk_renew_{doc['id']}_{datetime.now().strftime('%Y%m%d%H%M')}",
                related_entity_type="membership",
                related_entity_id=doc["id"],
                target_route="/membership"
            )
            notified_names.append(doc["full_name"])
            
    return {
        "success": True,
        "notified_count": len(notified_names),
        "notified_members": notified_names,
        "message": f"Renewal notices successfully sent to {len(notified_names)} member(s)."
    }
