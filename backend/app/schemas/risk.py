from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class RiskSourceRecord(BaseModel):
    type: str  # event, ledger, task, inventory, membership, expense
    id: Optional[str] = None
    title: Optional[str] = None

class RiskItem(BaseModel):
    id: str
    severity: str  # CRITICAL, WARNING, INFO
    category: str  # FINANCIAL, OPERATIONAL, LOGISTICAL, MEMBERSHIP
    title: str
    explanation: str
    source_record: RiskSourceRecord
    recommended_action: str
    resolved: bool = False

class RiskEvaluationResponse(BaseModel):
    readiness_score: int  # 0 to 100
    score_formula: str
    score_breakdown: Dict[str, Any]
    risk_items: List[RiskItem]
    total_critical: int
    total_warning: int
    total_info: int
    evaluated_at: str
