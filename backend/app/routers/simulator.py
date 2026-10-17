from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.schemas.simulator import SimulationRequest, SimulationResponse, ApplySimulationRequest, BudgetIncreaseRequest
from app.services.simulator_service import SimulatorService
from app.core.dependencies import require_roles

router = APIRouter(prefix="/api/simulator", tags=["Live Club Simulator"])

@router.post("/simulate", response_model=SimulationResponse)
def run_simulation(
    data: SimulationRequest,
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return SimulatorService.simulate(data)

@router.post("/apply")
def apply_simulation_scenario(
    data: ApplySimulationRequest,
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return SimulatorService.apply_simulation(data, current_user=current_user)

@router.post("/request-budget-increase")
def request_budget_increase(
    data: BudgetIncreaseRequest,
    current_user: dict = Depends(require_roles(["treasurer", "organizer", "admin"]))
):
    return SimulatorService.create_budget_request(data, current_user=current_user)

@router.get("/budget-requests")
def get_budget_requests(
    event_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["treasurer", "organizer", "admin"]))
):
    return SimulatorService.get_budget_requests(event_id=event_id, status=status)

@router.patch("/budget-requests/{req_id}/status")
def update_budget_request_status(
    req_id: str,
    status: str = Query(..., regex="^(approved|declined)$"),
    current_user: dict = Depends(require_roles(["organizer", "admin"]))
):
    return SimulatorService.update_budget_request_status(req_id, status=status, current_user=current_user)
