from fastapi import APIRouter, Depends, HTTPException
from app.schemas.correlation import CorrelatedRiskResponse, CorrelatedRiskItem, RiskActionRequest
from app.services.correlation_service import evaluate_correlated_risks, take_risk_action
from app.core.dependencies import require_roles

router = APIRouter(prefix="/api/intelligence", tags=["Operational Intelligence & Risk Correlation"])

@router.get("/risks", response_model=CorrelatedRiskResponse)
def get_correlated_risks(
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return evaluate_correlated_risks()

@router.post("/risks/{risk_id}/action", response_model=CorrelatedRiskItem)
def act_on_correlated_risk(
    risk_id: str,
    action_req: RiskActionRequest,
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    updated = take_risk_action(
        risk_id=risk_id,
        action_req=action_req,
        user_email=current_user.get("email", "unknown"),
        user_role=current_user.get("role", "organizer")
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Risk not found or invalid action")
    return updated
