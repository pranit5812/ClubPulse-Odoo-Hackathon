from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class AffectedEntity(BaseModel):
    entity_type: str  # event, task, expense, product, member, transaction
    id: str
    name: str

class CorrelatedRiskItem(BaseModel):
    id: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    category: str  # CROSS_MODULE, FINANCIAL, VOLUNTEER, CAPACITY, INVENTORY
    title: str
    relationship_explanation: str
    affected_entities: List[AffectedEntity]
    evidence: Dict[str, Any]
    recommended_action: str
    status: str = "open"  # open, acknowledged, resolved
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: str

class RiskActionRequest(BaseModel):
    action: str = Field(description="acknowledge or resolve")
    notes: Optional[str] = None

class CorrelatedRiskResponse(BaseModel):
    readiness_index: int
    formula_text: str
    total_critical: int
    total_high: int
    total_medium: int
    total_low: int
    risks: List[CorrelatedRiskItem]
    evaluated_at: str
