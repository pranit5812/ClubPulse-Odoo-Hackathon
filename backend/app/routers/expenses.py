import base64
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.schemas.ledger import ExpenseClaimCreate, ExpenseReviewRequest, ExpenseResponse
from app.services.ledger_service import LedgerService
from app.core.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/api/expenses", tags=["Expenses & Reimbursements"])

ALLOWED_RECEIPT_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf"
}

@router.post("/upload-receipt")
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Accept a fee receipt file (image or PDF) and return a data URL."""
    if file.content_type not in ALLOWED_RECEIPT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only images (JPEG, PNG, WebP, GIF) or PDF files are accepted as receipts."
        )
    contents = await file.read()
    if len(contents) > 8 * 1024 * 1024:  # 8 MB limit
        raise HTTPException(status_code=400, detail="Receipt file exceeds 8MB limit.")
    encoded = base64.b64encode(contents).decode("utf-8")
    data_url = f"data:{file.content_type};base64,{encoded}"
    return {
        "url": data_url,
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(contents)
    }

@router.post("/claim", response_model=ExpenseResponse)
def submit_claim(
    data: ExpenseClaimCreate,
    current_user: dict = Depends(get_current_user)
):
    return LedgerService.claim_expense(data, current_user=current_user)

@router.get("/my-claims", response_model=List[ExpenseResponse])
def get_my_claims(current_user: dict = Depends(get_current_user)):
    return LedgerService.list_expenses(user_id=current_user["id"])

@router.get("", response_model=List[ExpenseResponse])
def list_all_expenses(
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return LedgerService.list_expenses()

@router.patch("/{expense_id}/review", response_model=ExpenseResponse)
def review_expense(
    expense_id: str,
    data: ExpenseReviewRequest,
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return LedgerService.review_expense(expense_id, data, current_user=current_user)
