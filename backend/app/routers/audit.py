from fastapi import APIRouter, Depends, Query
from app.schemas.audit import AuditLogResponse
from app.services.audit_service import list_audit_logs
from app.core.dependencies import require_roles

router = APIRouter(prefix="/api/audit-logs", tags=["Audit Trail"])

@router.get("", response_model=AuditLogResponse)
def get_audit_trail(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return list_audit_logs(limit=limit, skip=skip)
