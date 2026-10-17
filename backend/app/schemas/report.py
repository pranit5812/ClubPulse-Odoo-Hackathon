from typing import Dict, Any, List
from pydantic import BaseModel

class HandoverReportResponse(BaseModel):
    generated_at: str
    academic_term: str
    opening_liquid_cash_paise: int
    closing_liquid_cash_paise: int
    total_income_paise: int
    total_expenses_paise: int
    net_semester_surplus_paise: int
    income_by_category: Dict[str, int]
    expenses_by_category: Dict[str, int]
    outstanding_reimbursements_paise: int
    active_commitments_paise: int
    pending_receivables_paise: int
    total_registered_members: int
    active_members_count: int
    total_events_conducted: int
    total_tickets_issued: int
    total_attendance_verified: int
    inventory_items_count: int
    total_inventory_valuation_paise: int
    pending_tasks_count: int
    critical_overdue_tasks_count: int
    executive_recommendations: List[str]
    audit_notes: List[str]
