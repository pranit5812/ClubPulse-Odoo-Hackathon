import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.database.mongodb import get_database
from app.schemas.correlation import (
    CorrelatedRiskItem,
    CorrelatedRiskResponse,
    AffectedEntity,
    RiskActionRequest
)
from app.services.notification_service import create_notification
from app.services.audit_service import record_audit_log

def _generate_risk_id(category: str, key_string: str) -> str:
    h = hashlib.sha256(f"{category}:{key_string}".encode("utf-8")).hexdigest()[:12]
    return f"risk_{category.lower()}_{h}"

def evaluate_correlated_risks() -> CorrelatedRiskResponse:
    db = get_database()
    now = datetime.now(timezone.utc)

    # Fetch live records from collections
    events = list(db["events"].find())
    tickets = list(db["tickets"].find())
    tasks = list(db["tasks"].find())
    expenses = list(db["expenses"].find())
    products = list(db["products"].find())
    orders = list(db["orders"].find())
    members = list(db["members"].find())

    detected_risks: List[Dict[str, Any]] = []

    # Map helpers
    tickets_by_event: Dict[str, list] = {}
    for t in tickets:
        eid = str(t.get("event_id", ""))
        tickets_by_event.setdefault(eid, []).append(t)

    tasks_by_event: Dict[str, list] = {}
    for t in tasks:
        eid = str(t.get("event_id", ""))
        tasks_by_event.setdefault(eid, []).append(t)

    expenses_by_event: Dict[str, list] = {}
    for e in expenses:
        eid = str(e.get("event_id", ""))
        expenses_by_event.setdefault(eid, []).append(e)

    # 1. Correlated Risk A: High Ticket Sales + Low Volunteer Coverage -> Crowd Safety / Check-in Bottleneck
    for ev in events:
        eid = str(ev.get("id") or ev.get("_id"))
        ev_tickets = tickets_by_event.get(eid, [])
        ev_tasks = tasks_by_event.get(eid, [])
        sold_count = len(ev_tickets) if ev_tickets else int(ev.get("booked_count", 0))
        cap = int(ev.get("capacity", 100))
        unassigned_vol_tasks = [t for t in ev_tasks if not t.get("assignee_id")]

        ev_date = str(ev.get("event_date") or ev.get("date") or "")
        days_rem = 7
        try:
            ev_dt = datetime.strptime(ev_date.split(" ")[0].split("T")[0], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            days_rem = (ev_dt - now).days
        except Exception:
            pass

        if sold_count >= 15 and (len(unassigned_vol_tasks) >= 1 or len(ev_tasks) == 0):
            risk_id = _generate_risk_id("CAP_VOL", f"{eid}_{sold_count}_{len(unassigned_vol_tasks)}")
            detected_risks.append({
                "id": risk_id,
                "severity": "CRITICAL" if days_rem <= 3 else "HIGH",
                "category": "CROSS_MODULE",
                "title": f"Crowd Bottleneck Risk: High Ticket Sales with Unstaffed Volunteers ({ev.get('title')})",
                "relationship_explanation": "Cross-module interaction: High ticket booking volume requires proportional check-in and ushering personnel. Missing volunteer assignments will lead to queue delays and safety bottlenecks at venue entry.",
                "affected_entities": [
                    {"entity_type": "event", "id": eid, "name": ev.get("title", "Event")},
                    {"entity_type": "ticket", "id": eid, "name": f"{sold_count} Tickets Sold"},
                    {"entity_type": "task", "id": eid, "name": f"{len(unassigned_vol_tasks)} Unassigned Tasks"}
                ],
                "evidence": {
                    "tickets_sold": sold_count,
                    "event_capacity": cap,
                    "unassigned_tasks_count": len(unassigned_vol_tasks),
                    "days_remaining": days_rem
                },
                "recommended_action": f"Urgent: Open volunteer roster signup or assign 3-4 student organizers to {ev.get('title')} logistics."
            })

    # 2. Correlated Risk B: High Merch Preorders / Low Stock -> Fulfillment Failure
    for p in products:
        pid = str(p.get("id") or p.get("_id"))
        stock = p.get("stock_quantity")
        if stock is None and "sizes" in p:
            stock = sum(s.get("stock", 0) for s in p["sizes"])
        stock = stock or 0

        p_orders = [o for o in orders if any(item.get("product_id") == pid for item in o.get("items", []))]
        total_ordered_units = sum(
            item.get("quantity", 1)
            for o in p_orders
            for item in o.get("items", [])
            if item.get("product_id") == pid
        )
        if total_ordered_units > stock or (stock <= 5 and total_ordered_units > 0):
            risk_id = _generate_risk_id("MERCH_FULFILL", f"{pid}_{stock}_{total_ordered_units}")
            severity = "CRITICAL" if total_ordered_units > stock else "HIGH"
            detected_risks.append({
                "id": risk_id,
                "severity": severity,
                "category": "INVENTORY",
                "title": f"Fulfillment Failure Imminent: Stock Deficit for {p.get('name')}",
                "relationship_explanation": "Cross-module interaction: Student orders and preorders exceed warehouse on-hand stock or safety buffer. Students will face unfulfilled orders during campus distribution.",
                "affected_entities": [
                    {"entity_type": "product", "id": pid, "name": p.get("name", "Product")},
                    {"entity_type": "order", "id": pid, "name": f"{len(p_orders)} Orders Pending"}
                ],
                "evidence": {
                    "product_name": p.get("name"),
                    "stock_on_hand": stock,
                    "units_demanded": total_ordered_units,
                    "deficit_units": max(0, total_ordered_units - stock)
                },
                "recommended_action": f"Immediately reorder batch of {p.get('name')} from campus vendor or cap online order intake."
            })

    # 3. Correlated Risk C: Approaching Event + Budget Exhausted + Unpaid Reimbursements
    for ev in events:
        eid = str(ev.get("id") or ev.get("_id"))
        budget = int(ev.get("estimated_budget_paise") or ev.get("budget_paise") or 0)
        ev_exp = expenses_by_event.get(eid, [])
        total_exp = sum(e.get("amount_paise", 0) for e in ev_exp)
        pending_reimb = sum(e.get("amount_paise", 0) for e in ev_exp if e.get("status") in ["pending", "submitted"])

        ev_date = str(ev.get("event_date") or ev.get("date") or "")
        days_rem = 7
        try:
            ev_dt = datetime.strptime(ev_date.split(" ")[0].split("T")[0], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            days_rem = (ev_dt - now).days
        except Exception:
            pass

        if budget > 0 and (total_exp > budget or pending_reimb > 0.3 * budget) and days_rem <= 10:
            risk_id = _generate_risk_id("FIN_EVENT", f"{eid}_{budget}_{total_exp}_{pending_reimb}")
            detected_risks.append({
                "id": risk_id,
                "severity": "CRITICAL" if total_exp > budget else "HIGH",
                "title": f"Event Financial Exposure: Overbudget with Outstanding Reimbursements ({ev.get('title')})",
                "category": "FINANCIAL",
                "relationship_explanation": "Cross-module interaction: Event expenses have consumed budget cap while volunteers have unapproved out-of-pocket reimbursements pending. Threatens student trust and club solvency.",
                "affected_entities": [
                    {"entity_type": "event", "id": eid, "name": ev.get("title", "Event")},
                    {"entity_type": "expense", "id": eid, "name": f"₹{pending_reimb/100:.0f} Pending Claims"}
                ],
                "evidence": {
                    "budget_paise": budget,
                    "total_expenses_paise": total_exp,
                    "pending_reimbursements_paise": pending_reimb,
                    "days_remaining": days_rem
                },
                "recommended_action": f"Treasurer audit of {ev.get('title')} claims; freeze auxiliary expense requests."
            })

    # 4. Correlated Risk D: Critical Tasks Unassigned Within 72h
    for t in tasks:
        tid = str(t.get("id") or t.get("_id"))
        is_assigned = bool(t.get("assignee_id"))
        due_str = t.get("due_date", "")
        status = t.get("status", "")
        if not is_assigned and status not in ["completed", "done"] and due_str:
            try:
                due_dt = datetime.strptime(due_str.split("T")[0], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                hours_rem = (due_dt - now).total_seconds() / 3600
                if 0 <= hours_rem <= 96:
                    risk_id = _generate_risk_id("TASK_TIME", f"{tid}_{hours_rem:.0f}")
                    detected_risks.append({
                        "id": risk_id,
                        "severity": "CRITICAL" if hours_rem <= 36 else "HIGH",
                        "category": "VOLUNTEER",
                        "title": f"Critical Milestone Unassigned with Imminent Deadline: '{t.get('title')}'",
                        "relationship_explanation": "Cross-module interaction: A time-sensitive deliverable linked to upcoming operations has zero assigned manpower within short readiness window.",
                        "affected_entities": [
                            {"entity_type": "task", "id": tid, "name": t.get("title", "Task")}
                        ],
                        "evidence": {
                            "task_id": tid,
                            "due_date": due_str,
                            "hours_remaining": round(hours_rem, 1),
                            "priority": t.get("priority", "medium")
                        },
                        "recommended_action": f"Assign task '{t.get('title')}' to an available student officer or delegate to lead organizer."
                    })
            except Exception:
                pass

    # 5. Correlated Risk E: Member Dues Collection Low
    annual_members = [m for m in members if m.get("membership_type") in ["annual", "semester"]]
    unpaid_dues_count = sum(1 for m in annual_members if m.get("dues_paid_paise", 0) < 50000)
    unpaid_ratio = unpaid_dues_count / len(annual_members) if annual_members else 0
    if unpaid_ratio > 0.30 and len(annual_members) >= 2:
        risk_id = _generate_risk_id("DUES_CASHFLOW", f"{unpaid_dues_count}_{len(annual_members)}")
        detected_risks.append({
            "id": risk_id,
            "severity": "MEDIUM",
            "category": "FINANCIAL",
            "title": f"Dues Collection Deficit: {unpaid_dues_count} Members with Outstanding Balances",
            "relationship_explanation": "Cross-module interaction: High ratio of registered members with unpaid dues depresses the operational cash buffer required to fund upfront deposits for upcoming campus events.",
            "affected_entities": [
                {"entity_type": "member", "id": "membership_cohort", "name": f"{unpaid_dues_count} Delinquent Members"}
            ],
            "evidence": {
                "total_members": len(annual_members),
                "unpaid_members": unpaid_dues_count,
                "unpaid_percentage": round(unpaid_ratio * 100, 1)
            },
            "recommended_action": "Broadcast automated dues renewal reminder to member emails and enable UPI direct payment link."
        })

    # Sync into MongoDB correlated_risks with persistence & deduplication
    final_items: List[CorrelatedRiskItem] = []
    total_critical = 0
    total_high = 0
    total_medium = 0
    total_low = 0

    for d_risk in detected_risks:
        rid = d_risk["id"]
        existing = db["correlated_risks"].find_one({"$or": [{"id": rid}, {"_id": rid}]})
        if existing:
            status = existing.get("status", "open")
            ack_by = existing.get("acknowledged_by")
            ack_at = existing.get("acknowledged_at")
            res_by = existing.get("resolved_by")
            res_at = existing.get("resolved_at")
            c_at = existing.get("created_at", now.isoformat())
        else:
            status = "open"
            ack_by, ack_at, res_by, res_at = None, None, None, None
            c_at = now.isoformat()
            db["correlated_risks"].insert_one({
                "id": rid,
                **d_risk,
                "status": status,
                "created_at": c_at
            })
            if d_risk["severity"] in ["CRITICAL", "HIGH"]:
                create_notification(
                    title=f"⚠️ {d_risk['severity']} Risk: {d_risk['title'][:40]}...",
                    message=d_risk["relationship_explanation"][:120] + "...",
                    category="readiness" if d_risk["category"] == "CROSS_MODULE" else "financial",
                    severity="critical" if d_risk["severity"] == "CRITICAL" else "warning",
                    target_roles=["organizer", "treasurer", "admin"],
                    deduplication_key=f"notif_{rid}",
                    related_entity_type="risk",
                    related_entity_id=rid,
                    target_route="/risk"
                )

        item = CorrelatedRiskItem(
            id=rid,
            severity=d_risk["severity"],
            category=d_risk["category"],
            title=d_risk["title"],
            relationship_explanation=d_risk["relationship_explanation"],
            affected_entities=[AffectedEntity(**ae) for ae in d_risk["affected_entities"]],
            evidence=d_risk["evidence"],
            recommended_action=d_risk["recommended_action"],
            status=status,
            acknowledged_by=ack_by,
            acknowledged_at=ack_at,
            resolved_by=res_by,
            resolved_at=res_at,
            created_at=c_at
        )

        if status != "resolved":
            if item.severity == "CRITICAL":
                total_critical += 1
            elif item.severity == "HIGH":
                total_high += 1
            elif item.severity == "MEDIUM":
                total_medium += 1
            elif item.severity == "LOW":
                total_low += 1

        final_items.append(item)

    penalty = (total_critical * 25) + (total_high * 12) + (total_medium * 5) + (total_low * 2)
    readiness_index = max(10, min(100, 100 - penalty))

    return CorrelatedRiskResponse(
        readiness_index=readiness_index,
        formula_text="Readiness Index = max(10, 100 - (Critical*25 + High*12 + Medium*5 + Low*2)). Resolved risks incur 0 penalty.",
        total_critical=total_critical,
        total_high=total_high,
        total_medium=total_medium,
        total_low=total_low,
        risks=final_items,
        evaluated_at=now.isoformat()
    )

def take_risk_action(
    risk_id: str,
    action_req: RiskActionRequest,
    user_email: str,
    user_role: str
) -> Optional[CorrelatedRiskItem]:
    db = get_database()
    now_iso = datetime.now(timezone.utc).isoformat()
    risk = db["correlated_risks"].find_one({"$or": [{"id": risk_id}, {"_id": risk_id}]})
    if not risk:
        return None

    update_fields: Dict[str, Any] = {}
    if action_req.action == "acknowledge":
        update_fields["status"] = "acknowledged"
        update_fields["acknowledged_by"] = user_email
        update_fields["acknowledged_at"] = now_iso
        summary = f"Acknowledged correlated risk {risk_id}: {action_req.notes or 'No notes'}"
    elif action_req.action == "resolve":
        update_fields["status"] = "resolved"
        update_fields["resolved_by"] = user_email
        update_fields["resolved_at"] = now_iso
        summary = f"Resolved correlated risk {risk_id}: {action_req.notes or 'Mitigation verified'}"
    else:
        return None

    if action_req.notes:
        update_fields["action_notes"] = action_req.notes

    db["correlated_risks"].update_one(
        {"$or": [{"id": risk_id}, {"_id": risk_id}]},
        {"$set": update_fields}
    )
    updated_doc = db["correlated_risks"].find_one({"$or": [{"id": risk_id}, {"_id": risk_id}]})

    record_audit_log(
        user_email=user_email,
        user_role=user_role,
        action=f"RISK_{action_req.action.upper()}",
        entity_type="correlated_risk",
        entity_id=risk_id,
        summary=summary,
        payload={"notes": action_req.notes}
    )

    return CorrelatedRiskItem(
        id=str(updated_doc.get("id") or updated_doc.get("_id")),
        severity=updated_doc.get("severity", "MEDIUM"),
        category=updated_doc.get("category", "CROSS_MODULE"),
        title=updated_doc.get("title", ""),
        relationship_explanation=updated_doc.get("relationship_explanation", ""),
        affected_entities=[AffectedEntity(**ae) for ae in updated_doc.get("affected_entities", [])],
        evidence=updated_doc.get("evidence", {}),
        recommended_action=updated_doc.get("recommended_action", ""),
        status=updated_doc.get("status", "open"),
        acknowledged_by=updated_doc.get("acknowledged_by"),
        acknowledged_at=updated_doc.get("acknowledged_at"),
        resolved_by=updated_doc.get("resolved_by"),
        resolved_at=updated_doc.get("resolved_at"),
        created_at=updated_doc.get("created_at", now_iso)
    )
