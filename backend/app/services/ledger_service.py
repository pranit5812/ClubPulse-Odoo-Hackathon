import uuid
import csv
import io
from datetime import datetime
from typing import List, Optional, Dict
from fastapi import HTTPException
from app.database.mongodb import get_database
from app.schemas.ledger import (
    TransactionCreate, TransactionResponse, FinancialSummaryResponse,
    ExpenseClaimCreate, ExpenseReviewRequest, ExpenseResponse,
    ExplainableFinancialInsights, EventFinancialInsight
)

class LedgerService:
    @staticmethod
    def get_summary() -> FinancialSummaryResponse:
        db = get_database()
        cursor = db["transactions"].find()
        
        cash_received = 0
        cash_paid = 0
        pending_receivables = 0
        committed_obligations = 0
        category_breakdown: Dict[str, int] = {}

        for txn in cursor:
            t_type = txn.get("transaction_type")
            amt = txn.get("amount_paise", 0)
            status = txn.get("status")
            category = txn.get("category", "other")

            category_breakdown[category] = category_breakdown.get(category, 0) + amt

            if t_type == "income":
                if status == "completed":
                    cash_received += amt
                elif status == "pending":
                    pending_receivables += amt
            elif t_type == "expense":
                if status == "completed":
                    cash_paid += amt
                elif status in ["committed", "approved"]:
                    committed_obligations += amt

        net_liquid = cash_received - cash_paid

        return FinancialSummaryResponse(
            cash_received_paise=cash_received,
            cash_paid_paise=cash_paid,
            pending_receivables_paise=pending_receivables,
            committed_obligations_paise=committed_obligations,
            net_liquid_balance_paise=net_liquid,
            category_breakdown=category_breakdown
        )

    @staticmethod
    def list_transactions(category: Optional[str] = None, t_type: Optional[str] = None) -> List[TransactionResponse]:
        db = get_database()
        query = {}
        if category:
            query["category"] = category
        if t_type:
            query["transaction_type"] = t_type

        cursor = db["transactions"].find(query).sort("created_at", -1)
        results = []
        for doc in cursor:
            results.append(TransactionResponse(
                id=doc["id"],
                amount_paise=doc["amount_paise"],
                transaction_type=doc["transaction_type"],
                category=doc.get("category", "other"),
                description=doc.get("description", ""),
                status=doc.get("status", "completed"),
                reference_id=doc.get("reference_id"),
                event_id=doc.get("event_id"),
                created_at=doc.get("created_at", ""),
                created_by=doc.get("created_by")
            ))
        return results

    @staticmethod
    def create_transaction(data: TransactionCreate, current_user: dict) -> TransactionResponse:
        db = get_database()
        txn_id = f"txn_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.utcnow().isoformat()

        doc = {
            "id": txn_id,
            "amount_paise": data.amount_paise,
            "transaction_type": data.transaction_type,
            "category": data.category,
            "description": data.description,
            "status": data.status,
            "reference_id": data.reference_id,
            "event_id": data.event_id,
            "created_at": now_iso,
            "created_by": current_user["id"]
        }
        db["transactions"].insert_one(doc)
        return TransactionResponse(**{k: v for k, v in doc.items() if k != "_id"})

    @staticmethod
    def export_csv() -> str:
        transactions = LedgerService.list_transactions()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Transaction ID", "Date", "Type", "Category",
            "Amount (INR)", "Status", "Description", "Reference ID"
        ])
        for txn in transactions:
            writer.writerow([
                txn.id,
                txn.created_at[:10] if txn.created_at else "",
                txn.transaction_type.upper(),
                txn.category,
                f"{txn.amount_paise / 100:.2f}",
                txn.status.upper(),
                txn.description,
                txn.reference_id or ""
            ])
        return output.getvalue()

    # Expenses & Reimbursements
    @staticmethod
    def claim_expense(data: ExpenseClaimCreate, current_user: dict) -> ExpenseResponse:
        db = get_database()
        exp_id = f"exp_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.utcnow().isoformat()

        doc = {
            "id": exp_id,
            "user_id": current_user["id"],
            "user_name": current_user["full_name"],
            "user_email": current_user["email"],
            "amount_paise": data.amount_paise,
            "category": data.category,
            "description": data.description,
            "event_id": data.event_id,
            "receipt_url": data.receipt_url,
            "receipt_filename": data.receipt_filename,
            "status": "pending",
            "reviewer_notes": None,
            "created_at": now_iso,
            "reviewed_at": None
        }
        db["expenses"].insert_one(doc)
        return ExpenseResponse(**{k: v for k, v in doc.items() if k != "_id"})

    @staticmethod
    def list_expenses(user_id: Optional[str] = None) -> List[ExpenseResponse]:
        db = get_database()
        query = {"user_id": user_id} if user_id else {}
        cursor = db["expenses"].find(query).sort("created_at", -1)
        results = []
        for doc in cursor:
            results.append(ExpenseResponse(
                id=doc["id"],
                user_id=doc["user_id"],
                user_name=doc["user_name"],
                user_email=doc["user_email"],
                amount_paise=doc["amount_paise"],
                category=doc.get("category", "logistics"),
                description=doc.get("description", ""),
                event_id=doc.get("event_id"),
                receipt_url=doc.get("receipt_url"),
                receipt_filename=doc.get("receipt_filename"),
                status=doc.get("status", "pending"),
                reviewer_notes=doc.get("reviewer_notes"),
                created_at=doc.get("created_at", ""),
                reviewed_at=doc.get("reviewed_at")
            ))
        return results

    @staticmethod
    def review_expense(expense_id: str, data: ExpenseReviewRequest, current_user: dict) -> ExpenseResponse:
        db = get_database()
        exp = db["expenses"].find_one({"id": expense_id})
        if not exp:
            raise HTTPException(status_code=404, detail="Expense claim not found.")

        now_iso = datetime.utcnow().isoformat()
        new_status = exp["status"]

        if data.action == "approve":
            new_status = "approved"
            # Record a committed obligation transaction
            db["transactions"].insert_one({
                "id": f"txn_{uuid.uuid4().hex[:10]}",
                "amount_paise": exp["amount_paise"],
                "transaction_type": "expense",
                "category": exp.get("category", "reimbursement"),
                "description": f"Approved reimbursement claim #{exp['id'][-6:]} for {exp['user_name']}",
                "status": "committed",
                "reference_id": exp["id"],
                "created_at": now_iso,
                "created_by": current_user["id"]
            })
        elif data.action == "reject":
            new_status = "rejected"
        elif data.action == "disburse":
            new_status = "disbursed"
            # Settle obligation -> create completed expense transaction
            # Remove any committed txn for this expense or update it
            db["transactions"].update_one(
                {"reference_id": exp["id"], "status": "committed"},
                {"$set": {"status": "completed", "created_at": now_iso}}
            )

        db["expenses"].update_one(
            {"id": expense_id},
            {
                "$set": {
                    "status": new_status,
                    "reviewer_notes": data.notes,
                    "reviewed_at": now_iso
                }
            }
        )
        updated = db["expenses"].find_one({"id": expense_id})
        return ExpenseResponse(**{k: v for k, v in updated.items() if k != "_id"})

    @staticmethod
    def get_explainable_insights() -> ExplainableFinancialInsights:
        db = get_database()
        now_iso = datetime.utcnow().isoformat()

        # 1. Transactions breakdown
        txns = list(db["transactions"].find())
        actual_income = 0
        actual_expenses = 0
        upcoming_commitments = 0
        pending_receivables = 0

        for t in txns:
            amt = t.get("amount_paise", 0)
            status = t.get("status")
            t_type = t.get("transaction_type")

            if t_type == "income":
                if status == "completed":
                    actual_income += amt
                elif status == "pending":
                    pending_receivables += amt
            elif t_type == "expense":
                if status == "completed":
                    actual_expenses += amt
                elif status in ["committed", "approved"]:
                    upcoming_commitments += amt

        available_cash = actual_income - actual_expenses

        # 2. Pending reimbursements from expenses collection
        expenses = list(db["expenses"].find())
        pending_reimbursements = sum(
            e.get("amount_paise", 0) for e in expenses if e.get("status") in ["pending", "submitted"]
        )

        # 3. Outstanding member dues
        members = list(db["members"].find())
        outstanding_dues = 0
        unpaid_members_count = 0
        for m in members:
            # Expected annual dues: 50,000 paise (₹500)
            if m.get("membership_type") in ["annual", "semester"]:
                paid = m.get("dues_paid_paise", 0)
                expected = 50000 if m.get("membership_type") == "annual" else 30000
                if paid < expected:
                    outstanding_dues += (expected - paid)
                    unpaid_members_count += 1

        projected_income = actual_income + pending_receivables + outstanding_dues

        # 4. Event-level breakdown
        events = list(db["events"].find())
        tickets = list(db["tickets"].find())
        tickets_by_event: Dict[str, list] = {}
        for tk in tickets:
            eid = str(tk.get("event_id", ""))
            tickets_by_event.setdefault(eid, []).append(tk)

        expenses_by_event: Dict[str, list] = {}
        for ex in expenses:
            eid = str(ex.get("event_id", ""))
            expenses_by_event.setdefault(eid, []).append(ex)

        event_insights: List[EventFinancialInsight] = []
        budgeted_expenses = 0

        for ev in events:
            eid = str(ev.get("id") or ev.get("_id"))
            title = ev.get("title", "Event")
            budget = int(ev.get("estimated_budget_paise") or ev.get("budget_paise") or 0)
            budgeted_expenses += budget

            ev_exp = expenses_by_event.get(eid, [])
            actual_event_expenses = sum(e.get("amount_paise", 0) for e in ev_exp)

            ev_tkt = tickets_by_event.get(eid, [])
            if ev_tkt:
                proj_revenue = sum(t.get("total_amount_paise", 0) for t in ev_tkt)
            else:
                booked = int(ev.get("booked_count", 0))
                price = int(ev.get("member_price_paise", 0))
                proj_revenue = booked * price

            surplus = proj_revenue - actual_event_expenses
            is_surplus = surplus >= 0

            if actual_event_expenses > budget and budget > 0:
                ev_status = "deficit"
            elif actual_event_expenses > (0.8 * budget) and budget > 0:
                ev_status = "warning"
            else:
                ev_status = "healthy"

            event_insights.append(EventFinancialInsight(
                event_id=eid,
                title=title,
                budget_paise=budget,
                actual_expenses_paise=actual_event_expenses,
                projected_revenue_paise=proj_revenue,
                projected_surplus_deficit_paise=surplus,
                is_surplus=is_surplus,
                status=ev_status
            ))

        # 5. Historical comparison with honest data limitation
        historical_comparison = {
            "has_sufficient_history": False,
            "comparable_periods_available": 1,
            "period_label": "Current Semester (Spring 2026)",
            "limitation_statement": "Only single-semester operational records exist. Historical multi-year variance trends are withheld to avoid fabricated forecasting."
        }

        # 6. Traceable evidence
        traceable_evidence = {
            "completed_transactions_count": sum(1 for t in txns if t.get("status") == "completed"),
            "committed_transactions_count": sum(1 for t in txns if t.get("status") == "committed"),
            "pending_reimbursement_claims_count": sum(1 for e in expenses if e.get("status") in ["pending", "submitted"]),
            "unpaid_members_count": unpaid_members_count,
            "total_events_analyzed": len(events)
        }

        # 7. Treasurer recommendations
        recommendations = []
        if pending_reimbursements > 0:
            recommendations.append(f"Clear ₹{pending_reimbursements/100:.2f} in outstanding member reimbursement claims to maintain student trust.")
        if outstanding_dues > 0:
            recommendations.append(f"Collect ₹{outstanding_dues/100:.2f} in delinquent member dues through automated email reminders.")
        if available_cash < upcoming_commitments:
            recommendations.append("Warning: Net liquid reserves fall below committed obligations. Hold discretionary outlays.")
        else:
            recommendations.append("Liquid cash reserves comfortably cover current committed obligations.")

        return ExplainableFinancialInsights(
            actual_income_paise=actual_income,
            projected_income_paise=projected_income,
            actual_expenses_paise=actual_expenses,
            budgeted_expenses_paise=budgeted_expenses,
            pending_reimbursements_paise=pending_reimbursements,
            upcoming_commitments_paise=upcoming_commitments,
            outstanding_member_dues_paise=outstanding_dues,
            available_cash_paise=available_cash,
            event_insights=event_insights,
            historical_comparison=historical_comparison,
            traceable_evidence=traceable_evidence,
            treasurer_recommendations=recommendations,
            evaluated_at=now_iso
        )

