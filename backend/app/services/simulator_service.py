from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from app.database.mongodb import get_database
from app.schemas.simulator import (
    SimulationRequest, SimulationResponse, ScenarioMetrics, ApplySimulationRequest
)

class SimulatorService:
    @staticmethod
    def simulate(data: SimulationRequest) -> SimulationResponse:
        db = get_database()
        now_iso = datetime.utcnow().isoformat()
        
        current_plan_metrics = None
        event_title = None

        # Fetch current liquid reserves from ledger
        transactions = list(db["transactions"].find())
        cash_received = sum(t["amount_paise"] for t in transactions if t.get("transaction_type") == "income" and t.get("status") == "completed")
        cash_paid = sum(t["amount_paise"] for t in transactions if t.get("transaction_type") == "expense" and t.get("status") == "completed")
        current_liquid_paise = cash_received - cash_paid

        # If an existing event is referenced, load its current baseline
        if data.event_id:
            event = db["events"].find_one({"id": data.event_id})
            if event:
                event_title = event["title"]
                c_cap = event.get("capacity", 100)
                c_mem_p = event.get("member_price_paise", 0)
                c_non_p = event.get("non_member_price_paise", 10000)
                c_exp = event.get("estimated_budget_paise", 1500000)
                
                # Baseline 80% attendance, 50% member ratio
                c_attendees = int(c_cap * 0.80)
                c_mem_att = int(c_attendees * 0.50)
                c_non_att = c_attendees - c_mem_att
                
                c_max_rev = int((c_cap * 0.50 * c_mem_p) + (c_cap * 0.50 * c_non_p))
                c_proj_rev = int((c_mem_att * c_mem_p) + (c_non_att * c_non_p))
                c_surplus = c_proj_rev - c_exp
                c_rem_res = current_liquid_paise + c_surplus

                current_plan_metrics = ScenarioMetrics(
                    capacity=c_cap,
                    expected_attendees=c_attendees,
                    member_attendees=c_mem_att,
                    non_member_attendees=c_non_att,
                    max_possible_revenue_paise=c_max_rev,
                    projected_revenue_paise=c_proj_rev,
                    estimated_expenses_paise=c_exp,
                    projected_surplus_paise=c_surplus,
                    is_surplus=c_surplus >= 0,
                    remaining_reserve_paise=c_rem_res,
                    reserve_breached=c_rem_res < data.reserve_threshold_paise
                )

        # -----------------------------------------------------------------
        # Deterministic Proposed Scenario Calculations
        # -----------------------------------------------------------------
        p_cap = data.target_capacity
        p_att_rate = data.expected_attendance_rate
        p_mem_ratio = data.member_ratio
        p_mem_p = data.member_price_paise
        p_non_p = data.non_member_price_paise
        p_exp = data.estimated_expenses_paise
        p_threshold = data.reserve_threshold_paise

        p_expected_attendees = int(p_cap * p_att_rate)
        p_member_attendees = int(p_expected_attendees * p_mem_ratio)
        p_non_member_attendees = p_expected_attendees - p_member_attendees

        # Maximum potential revenue if sold out at full capacity with specified member ratio
        p_max_rev = int((p_cap * p_mem_ratio * p_mem_p) + (p_cap * (1 - p_mem_ratio) * p_non_p))
        
        # Forecast projected revenue based on expected attendance rate
        p_proj_rev = int((p_member_attendees * p_mem_p) + (p_non_member_attendees * p_non_p))
        p_surplus = p_proj_rev - p_exp
        p_remaining_reserve = current_liquid_paise + p_surplus
        p_reserve_breached = p_remaining_reserve < p_threshold

        proposed_scenario = ScenarioMetrics(
            capacity=p_cap,
            expected_attendees=p_expected_attendees,
            member_attendees=p_member_attendees,
            non_member_attendees=p_non_member_attendees,
            max_possible_revenue_paise=p_max_rev,
            projected_revenue_paise=p_proj_rev,
            estimated_expenses_paise=p_exp,
            projected_surplus_paise=p_surplus,
            is_surplus=p_surplus >= 0,
            remaining_reserve_paise=p_remaining_reserve,
            reserve_breached=p_reserve_breached
        )

        # -----------------------------------------------------------------
        # Variance Analysis
        # -----------------------------------------------------------------
        variance: Dict[str, Any] = {}
        if current_plan_metrics:
            variance = {
                "capacity_delta": p_cap - current_plan_metrics.capacity,
                "revenue_delta_paise": p_proj_rev - current_plan_metrics.projected_revenue_paise,
                "expense_delta_paise": p_exp - current_plan_metrics.estimated_expenses_paise,
                "surplus_delta_paise": p_surplus - current_plan_metrics.projected_surplus_paise,
                "reserve_delta_paise": p_remaining_reserve - current_plan_metrics.remaining_reserve_paise,
            }

        # -----------------------------------------------------------------
        # Explainable Constraints, Warnings & Sensitivity Suggestions
        # -----------------------------------------------------------------
        warnings: List[str] = []
        recommendations: List[str] = []

        if p_surplus < 0:
            shortfall_inr = abs(p_surplus) / 100
            warnings.append(
                f"Proposed event operates at a projected DEFICIT of ₹{shortfall_inr:,.2f}. Outflows exceed forecast income."
            )
            # Break-even price or capacity suggestion
            if p_expected_attendees > 0:
                breakeven_avg_ticket_paise = int(p_exp / p_expected_attendees)
                recommendations.append(
                    f"To break even at {int(p_att_rate * 100)}% attendance, the average ticket price must be at least ₹{breakeven_avg_ticket_paise / 100:.2f}."
                )

        if p_reserve_breached:
            deficit_headroom_inr = (p_threshold - p_remaining_reserve) / 100
            warnings.append(
                f"Safety reserve threshold of ₹{p_threshold / 100:,.2f} is BREACHED by ₹{deficit_headroom_inr:,.2f}."
            )
            recommendations.append(
                "Consider capping venue audiovisual rental budget or securing a co-sponsor to preserve club reserve safety."
            )

        if p_cap > 300:
            warnings.append(
                f"Large venue capacity ({p_cap} attendees) will require at least {int(p_cap / 25)} dedicated crowd-safety volunteers."
            )

        if not warnings:
            recommendations.append(
                "Proposed scenario is financially viable with healthy reserve buffer headroom."
            )

        # -----------------------------------------------------------------
        # Volunteer Coverage Impact & Operational Risks
        # -----------------------------------------------------------------
        needed_volunteers = max(3, int(p_expected_attendees / 20))
        baseline_volunteers = 5
        if data.event_id and event:
            baseline_volunteers = int(event.get("required_volunteer_count", 5))

        vol_delta = needed_volunteers - baseline_volunteers
        volunteer_impact = {
            "needed_volunteers": needed_volunteers,
            "baseline_volunteers": baseline_volunteers,
            "volunteer_gap": max(0, vol_delta),
            "ratio_attendees_per_volunteer": round(p_expected_attendees / needed_volunteers, 1) if needed_volunteers > 0 else 0,
            "assessment": "Critical deficit" if vol_delta >= 4 else ("Minor expansion required" if vol_delta > 0 else "Fully covered")
        }

        operational_risks: List[str] = []
        if vol_delta >= 3:
            operational_risks.append(f"Crowd safety & check-in queue bottleneck: {needed_volunteers} volunteers required ({vol_delta} above current baseline).")
        if p_reserve_breached:
            operational_risks.append("Club emergency reserve deficit risk if actual turnout dips below 80%.")
        if p_cap > 250:
            operational_risks.append("High venue density: Emergency egress and hardware power distribution require security clearance.")

        # -----------------------------------------------------------------
        # Deterministic Sensitivity Drivers (Elasticity ranking)
        # -----------------------------------------------------------------
        # Driver 1: Attendance rate swing +/- 10%
        att_delta_rev = int((0.10 * p_cap) * ((p_mem_ratio * p_mem_p) + ((1 - p_mem_ratio) * p_non_p)))
        # Driver 2: Non-member price swing +/- ₹50 (5000 paise)
        price_delta_rev = int(p_non_member_attendees * 5000)
        # Driver 3: Expense inflation +/- 15%
        exp_delta_cost = int(p_exp * 0.15)

        drivers = [
            {
                "driver": "Attendance Yield (±10%)",
                "impact_paise": att_delta_rev,
                "impact_inr": att_delta_rev / 100,
                "direction": "High Sensitivity",
                "description": "Each 10% shift in attendee turnout changes net surplus by ₹{:.2f}".format(att_delta_rev / 100)
            },
            {
                "driver": "Non-Member Ticket Price (±₹50)",
                "impact_paise": price_delta_rev,
                "impact_inr": price_delta_rev / 100,
                "direction": "Moderate Sensitivity",
                "description": "Adjusting non-member admission price by ₹50 shifts revenue by ₹{:.2f}".format(price_delta_rev / 100)
            },
            {
                "driver": "Expense Variance (+15% Overrun)",
                "impact_paise": exp_delta_cost,
                "impact_inr": exp_delta_cost / 100,
                "direction": "High Vulnerability",
                "description": "A 15% budget overrun increases costs by ₹{:.2f}".format(exp_delta_cost / 100)
            }
        ]
        # Sort by impact_paise descending
        drivers.sort(key=lambda d: d["impact_paise"], reverse=True)

        assumptions_text = (
            f"Model assumes {int(p_att_rate * 100)}% attendance yield across {p_cap} capacity, "
            f"with {int(p_mem_ratio * 100)}% member participation paying ₹{p_mem_p / 100:.2f} "
            f"and non-members paying ₹{p_non_p / 100:.2f}."
        )

        return SimulationResponse(
            event_id=data.event_id,
            event_title=event_title,
            current_plan=current_plan_metrics,
            proposed_scenario=proposed_scenario,
            variance=variance,
            volunteer_impact=volunteer_impact,
            key_sensitivity_drivers=drivers,
            operational_risks=operational_risks,
            warnings=warnings,
            recommendations=recommendations,
            assumptions_statement=assumptions_text,
            simulated_at=now_iso
        )

    @staticmethod
    def apply_simulation(data: ApplySimulationRequest, current_user: dict) -> dict:
        db = get_database()
        event = db["events"].find_one({"id": data.event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found.")

        # Server-side validation
        if data.capacity < event.get("booked_count", 0):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reduce capacity to {data.capacity} below already booked seats ({event.get('booked_count', 0)})."
            )

        now_iso = datetime.utcnow().isoformat()
        update_doc = {
            "capacity": data.capacity,
            "member_price_paise": data.member_price_paise,
            "non_member_price_paise": data.non_member_price_paise,
            "estimated_budget_paise": data.estimated_budget_paise,
            "updated_at": now_iso,
            "updated_by": current_user["id"]
        }
        if data.expense_categories is not None:
            update_doc["expense_categories"] = data.expense_categories

        db["events"].update_one(
            {"id": data.event_id},
            {"$set": update_doc}
        )

        # Publish meaningful committed allocation entries directly to Treasury Ledger (transactions collection)
        import uuid
        db["transactions"].delete_many({
            "event_id": data.event_id,
            "reference_id": {"$regex": r"^sim_"}
        })

        committed_count = 0
        if data.expense_categories:
            for idx, cat in enumerate(data.expense_categories):
                cat_name = cat.get("name", "Miscellaneous")
                amount_inr = float(cat.get("amount", 0) or 0)
                cat_paise = int(round(amount_inr * 100))
                if cat_paise > 0:
                    cat_slug = cat_name.lower().replace(" ", "_").replace("&", "and")
                    txn_id = f"txn_{uuid.uuid4().hex[:10]}"
                    db["transactions"].insert_one({
                        "id": txn_id,
                        "amount_paise": cat_paise,
                        "transaction_type": "expense",
                        "category": cat_slug,
                        "description": f"Allocated Budget ({cat_name}) for '{event.get('title')}'",
                        "status": "committed",
                        "reference_id": f"sim_{data.event_id}_{cat_slug}_{idx}",
                        "event_id": data.event_id,
                        "created_at": now_iso,
                        "created_by": current_user.get("id")
                    })
                    committed_count += 1

        if committed_count == 0 and data.estimated_budget_paise > 0:
            txn_id = f"txn_{uuid.uuid4().hex[:10]}"
            db["transactions"].insert_one({
                "id": txn_id,
                "amount_paise": data.estimated_budget_paise,
                "transaction_type": "expense",
                "category": "budget_allocation",
                "description": f"Published Budget Allocation for '{event.get('title')}'",
                "status": "committed",
                "reference_id": f"sim_{data.event_id}_total",
                "event_id": data.event_id,
                "created_at": now_iso,
                "created_by": current_user.get("id")
            })

        return {
            "success": True,
            "message": f"Successfully published budget and categorized allocations for '{event['title']}' to Treasury Ledger.",
            "event_id": data.event_id,
            "updated_at": now_iso
        }

    @staticmethod
    def create_budget_request(data: Any, current_user: dict) -> dict:
        import uuid
        from app.services.notification_service import create_notification
        db = get_database()
        event = db["events"].find_one({"id": data.event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found.")

        now_iso = datetime.utcnow().isoformat()
        req_id = f"breq_{uuid.uuid4().hex[:10]}"

        req_doc = {
            "id": req_id,
            "event_id": data.event_id,
            "event_title": event.get("title", "Event"),
            "request_type": data.request_type,  # budget | volunteers | other
            "current_budget_paise": data.current_budget_paise,
            "requested_budget_paise": data.requested_budget_paise,
            "requested_volunteers": data.requested_volunteers,
            "operational_category": data.operational_category,
            "percentage_increase": data.percentage_increase,
            "message": data.message,
            "notes": data.notes,
            "status": "pending",  # pending | approved | declined
            "requested_by_id": current_user.get("id"),
            "requested_by_email": current_user.get("email", "treasurer@clubpulse.edu"),
            "requested_by_name": current_user.get("full_name") or current_user.get("email"),
            "created_at": now_iso,
            "updated_at": now_iso
        }

        db["budget_requests"].insert_one(req_doc)

        # Notify Organizers and Admins
        try:
            notif_msg = f"{current_user.get('email')} submitted a {data.request_type} request for '{event.get('title')}': {data.message}"
            create_notification(
                title=f"Treasurer Request: {event.get('title')}",
                message=notif_msg,
                category="financial_alert",
                severity="warning",
                target_roles=["organizer", "admin"],
                deduplication_key=f"breq_notif_{req_id}",
                related_entity_type="event",
                related_entity_id=data.event_id,
                target_route="/simulator"
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": "Request submitted successfully to Organizers.",
            "request": {k: v for k, v in req_doc.items() if k != "_id"}
        }

    @staticmethod
    def get_budget_requests(event_id: Optional[str] = None, status: Optional[str] = None) -> List[dict]:
        db = get_database()
        query = {}
        if event_id:
            query["event_id"] = event_id
        if status:
            query["status"] = status
        
        cursor = db["budget_requests"].find(query).sort("created_at", -1)
        results = []
        for doc in cursor:
            doc_data = {k: v for k, v in doc.items() if k != "_id"}
            results.append(doc_data)
        return results

    @staticmethod
    def update_budget_request_status(req_id: str, status: str, current_user: dict) -> dict:
        from app.services.notification_service import create_notification
        if status not in ["approved", "declined"]:
            raise HTTPException(status_code=400, detail="Status must be 'approved' or 'declined'.")

        db = get_database()
        req = db["budget_requests"].find_one({"id": req_id})
        if not req:
            raise HTTPException(status_code=404, detail="Budget request not found.")

        now_iso = datetime.utcnow().isoformat()
        db["budget_requests"].update_one(
            {"id": req_id},
            {
                "$set": {
                    "status": status,
                    "resolved_by": current_user.get("email"),
                    "resolved_at": now_iso,
                    "updated_at": now_iso
                }
            }
        )

        event_title = req.get("event_title", "Event")
        event_id = req.get("event_id")

        # If approved, mutate the event parameters
        if status == "approved" and event_id:
            event = db["events"].find_one({"id": event_id})
            if event:
                event_updates = {"updated_at": now_iso}
                if req.get("request_type") == "budget" and req.get("requested_budget_paise"):
                    event_updates["estimated_budget_paise"] = req["requested_budget_paise"]
                elif req.get("request_type") == "volunteers" and req.get("requested_volunteers"):
                    current_vols = int(event.get("required_volunteer_count", 0))
                    event_updates["required_volunteer_count"] = current_vols + int(req["requested_volunteers"])
                
                db["events"].update_one({"id": event_id}, {"$set": event_updates})

        # Notify Treasurer and Admin
        try:
            status_word = "Approved" if status == "approved" else "Declined"
            create_notification(
                title=f"Request {status_word}: {event_title}",
                message=f"Your {req.get('request_type')} request for '{event_title}' was {status} by organizer {current_user.get('email')}.",
                category="financial_alert",
                severity="info" if status == "approved" else "warning",
                target_roles=["treasurer", "admin"],
                deduplication_key=f"breq_status_{req_id}_{status}",
                related_entity_type="event",
                related_entity_id=event_id,
                target_route="/simulator"
            )
        except Exception:
            pass

        # Record audit log
        try:
            from app.services.audit_service import record_audit_log
            record_audit_log(
                user_email=current_user.get("email", "unknown"),
                user_role=current_user.get("role", "organizer"),
                action=f"BUDGET_REQUEST_{status.upper()}",
                entity_type="budget_request",
                entity_id=req_id,
                summary=f"{status.capitalize()} {req.get('request_type')} request for event '{event_title}'",
                payload={"request_id": req_id, "status": status, "event_id": event_id}
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Request has been marked as {status}.",
            "request_id": req_id,
            "status": status
        }


