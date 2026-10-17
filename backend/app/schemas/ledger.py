from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class TransactionCreate(BaseModel):
    amount_paise: int = Field(..., gt=0)
    transaction_type: str = "income"  # income, expense
    category: str  # membership_dues, ticket_sale, merchandise, fundraiser, logistics, refreshments, production, reimbursement, other
    description: str
    status: str = "completed"  # completed, pending, committed
    reference_id: Optional[str] = None
    event_id: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    amount_paise: int
    transaction_type: str
    category: str
    description: str
    status: str
    reference_id: Optional[str] = None
    event_id: Optional[str] = None
    created_at: str
    created_by: Optional[str] = None

class FinancialSummaryResponse(BaseModel):
    cash_received_paise: int
    cash_paid_paise: int
    pending_receivables_paise: int
    committed_obligations_paise: int
    net_liquid_balance_paise: int
    category_breakdown: Dict[str, int]

class ExpenseClaimCreate(BaseModel):
    amount_paise: int = Field(..., gt=0)
    category: str = "logistics"
    description: str
    event_id: Optional[str] = None
    receipt_url: Optional[str] = None
    receipt_filename: Optional[str] = None

class ExpenseReviewRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|disburse)$")
    notes: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    amount_paise: int
    category: str
    description: str
    event_id: Optional[str] = None
    receipt_url: Optional[str] = None
    receipt_filename: Optional[str] = None
    status: str  # pending, approved, rejected, disbursed
    reviewer_notes: Optional[str] = None
    created_at: str
    reviewed_at: Optional[str] = None

class EventFinancialInsight(BaseModel):
    event_id: str
    title: str
    budget_paise: int
    actual_expenses_paise: int
    projected_revenue_paise: int
    projected_surplus_deficit_paise: int
    is_surplus: bool
    status: str  # healthy, warning, deficit

class ExplainableFinancialInsights(BaseModel):
    actual_income_paise: int
    projected_income_paise: int
    actual_expenses_paise: int
    budgeted_expenses_paise: int
    pending_reimbursements_paise: int
    upcoming_commitments_paise: int
    outstanding_member_dues_paise: int
    available_cash_paise: int
    event_insights: List[EventFinancialInsight]
    historical_comparison: Dict[str, Any]
    traceable_evidence: Dict[str, Any]
    treasurer_recommendations: List[str]
    evaluated_at: str

