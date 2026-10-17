from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ReadinessCategoryScore(BaseModel):
    category: str  # financial, volunteers, capacity, tasks, resources
    title: str
    score: int = Field(ge=0, le=100)
    weight: float
    status: str  # optimal, warning, critical, missing_data
    evidence: Dict[str, Any]
    blockers: List[str] = []
    recommended_action: str

class ReadinessTimelineItem(BaseModel):
    id: str
    title: str
    due_date: str
    category: str
    status: str  # done, pending, overdue
    is_critical_path: bool = False
    assignee_name: Optional[str] = None
    days_until_event: int

class EventReadinessDetail(BaseModel):
    event_id: str
    event_title: str
    event_date: str
    venue: str
    days_remaining: int
    overall_readiness_score: int = Field(ge=0, le=100)
    overall_status: str  # ready, attention_required, at_risk
    critical_blockers_count: int
    category_scores: List[ReadinessCategoryScore]
    timeline: List[ReadinessTimelineItem]
    formula_explanation: str
    weights_used: Dict[str, float]
    evaluated_at: str

class EventReadinessSummary(BaseModel):
    event_id: str
    event_title: str
    event_date: str
    days_remaining: int
    overall_readiness_score: int
    overall_status: str
    critical_blockers_count: int
    top_blocker: Optional[str] = None
