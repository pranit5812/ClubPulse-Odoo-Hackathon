from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class SimulationRequest(BaseModel):
    event_id: Optional[str] = None
    target_capacity: int = Field(default=200, ge=10, le=5000)
    member_price_paise: int = Field(default=15000, ge=0)  # ₹150
    non_member_price_paise: int = Field(default=25000, ge=0)  # ₹250
    expected_attendance_rate: float = Field(default=0.85, ge=0.1, le=1.0)
    member_ratio: float = Field(default=0.60, ge=0.0, le=1.0)
    estimated_expenses_paise: int = Field(default=2500000, ge=0)  # ₹25,000
    reserve_threshold_paise: int = Field(default=500000, ge=0)  # ₹5,000

class ScenarioMetrics(BaseModel):
    capacity: int
    expected_attendees: int
    member_attendees: int
    non_member_attendees: int
    max_possible_revenue_paise: int
    projected_revenue_paise: int
    estimated_expenses_paise: int
    projected_surplus_paise: int
    is_surplus: bool
    remaining_reserve_paise: int
    reserve_breached: bool

class SimulationResponse(BaseModel):
    event_id: Optional[str] = None
    event_title: Optional[str] = None
    current_plan: Optional[ScenarioMetrics] = None
    proposed_scenario: ScenarioMetrics
    variance: Dict[str, Any]
    volunteer_impact: Optional[Dict[str, Any]] = None
    key_sensitivity_drivers: List[Dict[str, Any]] = []
    operational_risks: List[str] = []
    warnings: List[str]
    recommendations: List[str]
    assumptions_statement: str
    simulated_at: str

class ApplySimulationRequest(BaseModel):
    event_id: str
    capacity: int
    member_price_paise: int
    non_member_price_paise: int
    estimated_budget_paise: int
    expense_categories: Optional[List[Dict[str, Any]]] = None

class BudgetIncreaseRequest(BaseModel):
    event_id: str
    request_type: str = "budget"  # budget | volunteers | other
    current_budget_paise: int = 0
    requested_budget_paise: Optional[int] = None
    requested_volunteers: Optional[int] = None
    operational_category: Optional[str] = None
    percentage_increase: Optional[float] = None
    message: str
    notes: Optional[str] = None

