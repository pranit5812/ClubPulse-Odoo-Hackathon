from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response
from app.schemas.ledger import (
    TransactionCreate, TransactionResponse, FinancialSummaryResponse, ExplainableFinancialInsights
)
from app.services.ledger_service import LedgerService
from app.core.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/api/transactions", tags=["Financial Ledger"])

@router.get("/explainable-insights", response_model=ExplainableFinancialInsights)
def get_explainable_insights(current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))):
    return LedgerService.get_explainable_insights()

@router.get("/summary", response_model=FinancialSummaryResponse)
def get_summary(current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))):
    return LedgerService.get_summary()

@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    category: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return LedgerService.list_transactions(category=category, t_type=transaction_type)

@router.post("", response_model=TransactionResponse)
def create_transaction(
    data: TransactionCreate,
    current_user: dict = Depends(require_roles(["treasurer", "admin"]))
):
    return LedgerService.create_transaction(data, current_user=current_user)

@router.get("/export/csv")
def export_csv(current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))):
    csv_data = LedgerService.export_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=clubpulse_ledger.csv"}
    )
