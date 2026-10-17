from fastapi import APIRouter, Depends
from app.schemas.risk import RiskEvaluationResponse
from app.services.risk_engine import OperationalRiskEngine
from app.core.dependencies import require_roles

router = APIRouter(prefix="/api/risk", tags=["Operational Risk Engine"])

@router.get("/evaluate", response_model=RiskEvaluationResponse)
def evaluate_operational_risks(
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return OperationalRiskEngine.evaluate()
