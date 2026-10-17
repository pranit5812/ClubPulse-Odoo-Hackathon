from fastapi import APIRouter, Depends, Response
from app.schemas.report import HandoverReportResponse
from app.services.report_service import ReportService
from app.core.dependencies import require_roles

router = APIRouter(prefix="/api/reports", tags=["Handover Reports"])

@router.get("/handover", response_model=HandoverReportResponse)
def get_handover_report(
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return ReportService.generate_handover_report()

@router.get("/handover/export/csv")
def export_handover_report_csv(
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    csv_data = ReportService.export_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=clubpulse_handover_report.csv"}
    )
