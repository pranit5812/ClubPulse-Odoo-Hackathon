from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ActionItem(BaseModel):
    id: str
    category: str  # RISK, TASK, FINANCIAL, INVENTORY, MEMBERSHIP
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    title: str
    description: str
    target_route: str  # e.g., /risk, /organizer/tasks, /ledger, /organizer/merch
    target_entity_type: str  # risk, task, expense, product, member
    target_entity_id: str
    assignee_name: Optional[str] = None
    due_date: Optional[str] = None
    status: str = "open"  # open, in_progress, resolved
    evidence: Dict[str, Any] = {}
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: str

class ActionItemUpdateRequest(BaseModel):
    status: Optional[str] = Field(None, description="open, in_progress, resolved")
    resolution_notes: Optional[str] = None
    assignee_name: Optional[str] = None

class ActionCenterSummary(BaseModel):
    total_actions: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    open_count: int
    in_progress_count: int
    resolved_count: int
    items: List[ActionItem]
