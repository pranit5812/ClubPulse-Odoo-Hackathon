from typing import Dict, Any, Optional, List
from pydantic import BaseModel

class AuditLogItem(BaseModel):
    id: str
    user_email: str
    user_role: str
    action: str  # e.g., "RISK_ACKNOWLEDGE", "RISK_RESOLVE", "ACTION_RESOLVE", "EXPENSE_CREATE", "EXPENSE_APPROVE", "SIMULATION_RUN"
    entity_type: str
    entity_id: str
    summary: str
    payload: Optional[Dict[str, Any]] = None
    created_at: str

class AuditLogResponse(BaseModel):
    total: int
    logs: List[AuditLogItem]
