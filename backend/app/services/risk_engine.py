from datetime import datetime, date, timedelta
from typing import List, Dict, Any
from app.database.mongodb import get_database
from app.schemas.risk import RiskItem, RiskSourceRecord, RiskEvaluationResponse

class OperationalRiskEngine:
    @staticmethod
    def evaluate() -> RiskEvaluationResponse:
        db = get_database()
        now = datetime.utcnow()
        today_str = date.today().isoformat()
        in_14_days = (date.today() + timedelta(days=14)).isoformat()

        risk_items: List[RiskItem] = []

        # ----------------------------------------------------
        # 1. FINANCIAL AUDIT: Reserve & Obligation Analysis
        # ----------------------------------------------------
        transactions = list(db["transactions"].find())
        cash_received = sum(t["amount_paise"] for t in transactions if t.get("transaction_type") == "income" and t.get("status") == "completed")
        cash_paid = sum(t["amount_paise"] for t in transactions if t.get("transaction_type") == "expense" and t.get("status") == "completed")
        committed_obligations = sum(t["amount_paise"] for t in transactions if t.get("transaction_type") == "expense" and t.get("status") in ["committed", "approved"])
        
        net_liquid_paise = cash_received - cash_paid
        min_reserve_threshold_paise = 1000000  # ₹10,000 reserve policy

        fin_health_score = 100
        if committed_obligations > net_liquid_paise:
            deficit_paise = committed_obligations - net_liquid_paise
            deficit_inr = deficit_paise / 100
            liquid_inr = net_liquid_paise / 100
            committed_inr = committed_obligations / 100
            risk_items.append(RiskItem(
                id="RISK-FIN-01",
                severity="CRITICAL",
                category="FINANCIAL",
                title="Committed Obligations Exceed Liquid Cash Reserves",
                explanation=f"Approved unpaid obligations (₹{committed_inr:,.2f}) exceed liquid cash (₹{liquid_inr:,.2f}) by ₹{deficit_inr:,.2f}.",
                source_record=RiskSourceRecord(type="ledger", id="financial_summary", title="Cash Flow Deficit"),
                recommended_action="Halt discretionary reimbursement disbursements immediately and accelerate ticket & merchandise collections.",
                resolved=False
            ))
            fin_health_score = max(10, int((net_liquid_paise / max(1, committed_obligations)) * 60))
        elif net_liquid_paise - committed_obligations < min_reserve_threshold_paise:
            headroom_inr = (net_liquid_paise - committed_obligations) / 100
            reserve_inr = min_reserve_threshold_paise / 100
            risk_items.append(RiskItem(
                id="RISK-FIN-02",
                severity="WARNING",
                category="FINANCIAL",
                title="Club Liquid Headroom Below Safety Reserve Policy",
                explanation=f"Net liquid headroom after committed obligations is ₹{headroom_inr:,.2f}, which is below the required minimum safety buffer of ₹{reserve_inr:,.2f}.",
                source_record=RiskSourceRecord(type="ledger", id="reserve_buffer", title="Reserve Headroom Warning"),
                recommended_action="Review upcoming event logistics to reduce committed budget items or secure sponsorship pledges.",
                resolved=False
            ))
            fin_health_score = 75

        # ----------------------------------------------------
        # 2. TASK & VOLUNTEER AUDIT: Overdue & Critical Path
        # ----------------------------------------------------
        tasks = list(db["tasks"].find())
        total_tasks = len(tasks)
        done_tasks = len([t for t in tasks if t.get("status") == "done"])
        overdue_tasks = [t for t in tasks if t.get("due_date", "") < today_str and t.get("status") != "done"]
        critical_overdue = [t for t in overdue_tasks if t.get("is_critical_path") or t.get("priority") == "critical"]
        unassigned_critical = [t for t in tasks if (t.get("is_critical_path") or t.get("priority") in ["critical", "high"]) and not t.get("assignee_id") and t.get("status") != "done"]

        for cot in critical_overdue:
            risk_items.append(RiskItem(
                id=f"RISK-TSK-{cot['id'][-4:]}",
                severity="CRITICAL",
                category="OPERATIONAL",
                title=f"Critical Path Task Overdue: {cot['title']}",
                explanation=f"Task was due on {cot['due_date']} (assigned to {cot.get('assignee_name') or 'Unassigned'}). Delay directly threatens event operations.",
                source_record=RiskSourceRecord(type="task", id=cot["id"], title=cot["title"]),
                recommended_action=f"Reassign lead or expedite completion today. Contact {cot.get('assignee_name') or 'Lead Organizer'}.",
                resolved=False
            ))

        for uct in unassigned_critical:
            risk_items.append(RiskItem(
                id=f"RISK-UNASSIGN-{uct['id'][-4:]}",
                severity="WARNING",
                category="OPERATIONAL",
                title=f"Unassigned High-Priority Task: {uct['title']}",
                explanation=f"Task is marked high/critical priority with due date {uct['due_date']} but has no designated owner.",
                source_record=RiskSourceRecord(type="task", id=uct["id"], title=uct["title"]),
                recommended_action="Assign a responsible committee member immediately to establish accountability.",
                resolved=False
            ))

        task_velocity_score = 100
        if total_tasks > 0:
            completion_ratio = done_tasks / total_tasks
            task_velocity_score = int(completion_ratio * 70 + (30 if not critical_overdue else 0))
            if critical_overdue:
                task_velocity_score = max(20, task_velocity_score - (len(critical_overdue) * 20))

        # ----------------------------------------------------
        # 3. EVENT LOGISTICS & CAPACITY STRESS AUDIT
        # ----------------------------------------------------
        events = list(db["events"].find())
        event_logistics_score = 100

        for evt in events:
            # Check volunteer allocation for upcoming events
            req_volunteers = evt.get("required_volunteer_count", 5)
            # Count assigned tasks for this event
            assigned_event_volunteers = len(set(
                t["assignee_id"] for t in tasks 
                if t.get("event_id") == evt["id"] and t.get("assignee_id")
            ))
            
            if evt.get("event_date", "") >= today_str:
                if assigned_event_volunteers < req_volunteers:
                    deficit_vols = req_volunteers - assigned_event_volunteers
                    risk_items.append(RiskItem(
                        id=f"RISK-EVT-VOL-{evt['id'][-4:]}",
                        severity="WARNING",
                        category="LOGISTICAL",
                        title=f"Volunteer Shortage for '{evt['title']}'",
                        explanation=f"Event requires {req_volunteers} volunteers, but only {assigned_event_volunteers} active owners assigned ({deficit_vols} missing).",
                        source_record=RiskSourceRecord(type="event", id=evt["id"], title=evt["title"]),
                        recommended_action="Broadcast a volunteer sign-up announcement to members or reassign free committee staff.",
                        resolved=False
                    ))
                    event_logistics_score = max(50, event_logistics_score - 15)

            # Capacity Stress
            capacity = evt.get("capacity", 1)
            booked = evt.get("booked_count", 0)
            if booked >= capacity:
                risk_items.append(RiskItem(
                    id=f"RISK-EVT-CAP-{evt['id'][-4:]}",
                    severity="INFO",
                    category="LOGISTICAL",
                    title=f"Event Sold Out: '{evt['title']}'",
                    explanation=f"Bookings have reached 100% capacity ({booked}/{capacity}). Door registration will not be permitted.",
                    source_record=RiskSourceRecord(type="event", id=evt["id"], title=evt["title"]),
                    recommended_action="Verify venue security protocol and finalize attendee badge printing.",
                    resolved=True
                ))
            elif booked / capacity >= 0.90:
                risk_items.append(RiskItem(
                    id=f"RISK-EVT-CAP90-{evt['id'][-4:]}",
                    severity="WARNING",
                    category="LOGISTICAL",
                    title=f"High Capacity Stress for '{evt['title']}'",
                    explanation=f"Event is currently {int((booked/capacity)*100)}% full ({booked}/{capacity}).",
                    source_record=RiskSourceRecord(type="event", id=evt["id"], title=evt["title"]),
                    recommended_action="Coordinate crowd management and test QR check-in lane scanners in advance.",
                    resolved=False
                ))

        # ----------------------------------------------------
        # 4. INVENTORY & MERCHANDISE STOCK AUDIT
        # ----------------------------------------------------
        products = list(db["products"].find())
        inv_score = 100
        for prod in products:
            for sz in prod.get("sizes", []):
                if sz.get("stock", 0) <= 2:
                    risk_items.append(RiskItem(
                        id=f"RISK-INV-{prod['id'][-4:]}-{sz['size']}",
                        severity="WARNING",
                        category="OPERATIONAL",
                        title=f"Critical Low Stock: {prod['name']} (Size {sz['size']})",
                        explanation=f"Only {sz['stock']} unit(s) remaining for size {sz['size']}. Risk of order cancellation if demand surges.",
                        source_record=RiskSourceRecord(type="inventory", id=prod["id"], title=prod["name"]),
                        recommended_action="Initiate a reorder batch with the textile vendor or close online pre-orders for this size.",
                        resolved=False
                    ))
                    inv_score = max(40, inv_score - 15)

        # ----------------------------------------------------
        # 5. EXPENSE REIMBURSEMENT AUDIT
        # ----------------------------------------------------
        pending_expenses = list(db["expenses"].find({"status": "pending"}))
        if len(pending_expenses) >= 3:
            total_pending_amt_inr = sum(e["amount_paise"] for e in pending_expenses) / 100
            risk_items.append(RiskItem(
                id="RISK-EXP-PENDING",
                severity="WARNING",
                category="FINANCIAL",
                title=f"{len(pending_expenses)} Reimbursement Claims Awaiting Review",
                explanation=f"Total value of unapproved expense claims is ₹{total_pending_amt_inr:,.2f}. Delays erode volunteer trust.",
                source_record=RiskSourceRecord(type="expense", id="pending_batch", title="Unreviewed Expenses"),
                recommended_action="Treasurer should review uploaded receipts and approve valid reimbursement vouchers.",
                resolved=False
            ))
            fin_health_score = max(30, fin_health_score - 10)

        # ----------------------------------------------------
        # 6. COMPOSITE READINESS SCORE (0 - 100)
        # ----------------------------------------------------
        fin_health_score = max(0, min(100, fin_health_score))
        task_velocity_score = max(0, min(100, task_velocity_score))
        event_logistics_score = max(0, min(100, event_logistics_score))
        inv_score = max(0, min(100, inv_score))

        composite_score = int(
            (fin_health_score * 0.35) +
            (task_velocity_score * 0.25) +
            (event_logistics_score * 0.25) +
            (inv_score * 0.15)
        )
        composite_score = max(10, min(100, composite_score))

        critical_count = len([r for r in risk_items if r.severity == "CRITICAL"])
        warning_count = len([r for r in risk_items if r.severity == "WARNING"])
        info_count = len([r for r in risk_items if r.severity == "INFO"])

        formula_text = "Weighted Index: 35% Financial Solvency + 25% Task Velocity + 25% Event Logistics Readiness + 15% Inventory & Vendor Health"

        return RiskEvaluationResponse(
            readiness_score=composite_score,
            score_formula=formula_text,
            score_breakdown={
                "financial_solvency": fin_health_score,
                "task_velocity": task_velocity_score,
                "event_logistics": event_logistics_score,
                "inventory_health": inv_score,
                "liquid_cash_paise": net_liquid_paise,
                "committed_obligations_paise": committed_obligations,
                "critical_overdue_tasks": len(critical_overdue)
            },
            risk_items=risk_items,
            total_critical=critical_count,
            total_warning=warning_count,
            total_info=info_count,
            evaluated_at=now.isoformat()
        )
