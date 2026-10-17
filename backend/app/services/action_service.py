import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.database.mongodb import get_database
from app.schemas.action_center import (
    ActionItem,
    ActionItemUpdateRequest,
    ActionCenterSummary
)
from app.services.audit_service import record_audit_log

def get_action_center_items() -> ActionCenterSummary:
    db = get_database()
    now = datetime.now(timezone.utc)

    # 1. Fetch live candidates
    open_risks = list(db["correlated_risks"].find({"status": {"$ne": "resolved"}}))
    tasks = list(db["tasks"].find({"status": {"$nin": ["completed", "done"]}}))
    pending_expenses = list(db["expenses"].find({"status": {"$in": ["pending", "submitted"]}}))
    all_products = list(db["products"].find())

    # Saved actions from DB for status retention
    saved_actions_docs = list(db["action_center_items"].find())
    saved_actions_map = {str(doc.get("id") or doc.get("_id")): doc for doc in saved_actions_docs}

    aggregated_items: List[ActionItem] = []

    # Process Risks -> Action Items
    for r in open_risks:
        rid = str(r.get("id") or r.get("_id"))
        act_id = f"act_risk_{rid}"
        saved = saved_actions_map.get(act_id, {})
        status = saved.get("status", "open")
        aggregated_items.append(ActionItem(
            id=act_id,
            category="RISK",
            severity=r.get("severity", "HIGH"),
            title=r.get("title", "Operational Risk"),
            description=r.get("recommended_action", ""),
            target_route="/risk",
            target_entity_type="correlated_risk",
            target_entity_id=rid,
            assignee_name=saved.get("assignee_name"),
            due_date=saved.get("due_date"),
            status=status,
            evidence=r.get("evidence", {}),
            resolution_notes=saved.get("resolution_notes"),
            resolved_by=saved.get("resolved_by"),
            resolved_at=saved.get("resolved_at"),
            created_at=r.get("created_at", now.isoformat())
        ))

    # Process Urgent Tasks -> Action Items
    for t in tasks:
        tid = str(t.get("id") or t.get("_id"))
        due_str = t.get("due_date", "")
        is_unassigned = not t.get("assignee_id")
        is_overdue = False
        if due_str:
            try:
                due_dt = datetime.strptime(due_str.split("T")[0], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if due_dt < now:
                    is_overdue = True
            except Exception:
                pass

        if is_overdue or is_unassigned:
            act_id = f"act_task_{tid}"
            saved = saved_actions_map.get(act_id, {})
            status = saved.get("status", "open")
            sev = "CRITICAL" if is_overdue and t.get("priority") in ["critical", "urgent"] else ("HIGH" if is_overdue else "MEDIUM")
            reason = "Task is overdue" if is_overdue else "Task is unassigned"
            aggregated_items.append(ActionItem(
                id=act_id,
                category="TASK",
                severity=sev,
                title=f"{reason}: {t.get('title')}",
                description=f"Operational task '{t.get('title')}' requires immediate volunteer assignment or completion.",
                target_route="/organizer/tasks",
                target_entity_type="task",
                target_entity_id=tid,
                assignee_name=saved.get("assignee_name") or t.get("assignee_name"),
                due_date=due_str,
                status=status,
                evidence={"due_date": due_str, "priority": t.get("priority"), "status": t.get("status")},
                resolution_notes=saved.get("resolution_notes"),
                resolved_by=saved.get("resolved_by"),
                resolved_at=saved.get("resolved_at"),
                created_at=t.get("created_at", now.isoformat())
            ))

    # Process Pending Expenses -> Action Items
    for exp in pending_expenses:
        eid = str(exp.get("id") or exp.get("_id"))
        act_id = f"act_exp_{eid}"
        saved = saved_actions_map.get(act_id, {})
        status = saved.get("status", "open")
        amount_inr = exp.get("amount_paise", 0) / 100
        sev = "HIGH" if amount_inr >= 3000 else "MEDIUM"
        aggregated_items.append(ActionItem(
            id=act_id,
            category="FINANCIAL",
            severity=sev,
            title=f"Pending Reimbursement: ₹{amount_inr:.2f} for {exp.get('description', 'Expense')[:30]}",
            description=f"Claim submitted by {exp.get('user_name', 'member')}. Treasurer review and reconciliation needed.",
            target_route="/expenses",
            target_entity_type="expense",
            target_entity_id=eid,
            assignee_name=saved.get("assignee_name"),
            due_date=saved.get("due_date"),
            status=status,
            evidence={"amount_paise": exp.get("amount_paise"), "category": exp.get("category")},
            resolution_notes=saved.get("resolution_notes"),
            resolved_by=saved.get("resolved_by"),
            resolved_at=saved.get("resolved_at"),
            created_at=exp.get("created_at", now.isoformat())
        ))

    # Process Low Stock Products -> Action Items
    for prod in all_products:
        pid = str(prod.get("id") or prod.get("_id"))
        stock = prod.get("stock_quantity")
        if stock is None and "sizes" in prod:
            stock = sum(s.get("stock", 0) for s in prod["sizes"])
        stock = stock or 0

        if stock <= 5:
            act_id = f"act_prod_{pid}"
            saved = saved_actions_map.get(act_id, {})
            status = saved.get("status", "open")
            sev = "CRITICAL" if stock <= 2 else "HIGH"
            aggregated_items.append(ActionItem(
                id=act_id,
                category="INVENTORY",
                severity=sev,
                title=f"Low Inventory Alert: {prod.get('name')} ({stock} units left)",
                description=f"Physical stock is under safety threshold. Place purchase order to prevent booth stockouts.",
                target_route="/organizer/merch",
                target_entity_type="product",
                target_entity_id=pid,
                assignee_name=saved.get("assignee_name"),
                due_date=saved.get("due_date"),
                status=status,
                evidence={"stock_quantity": stock, "price_paise": prod.get("price_paise")},
                resolution_notes=saved.get("resolution_notes"),
                resolved_by=saved.get("resolved_by"),
                resolved_at=saved.get("resolved_at"),
                created_at=now.isoformat()
            ))

    # Calculate summaries
    crit_cnt = sum(1 for a in aggregated_items if a.severity == "CRITICAL" and a.status != "resolved")
    high_cnt = sum(1 for a in aggregated_items if a.severity == "HIGH" and a.status != "resolved")
    med_cnt = sum(1 for a in aggregated_items if a.severity == "MEDIUM" and a.status != "resolved")
    low_cnt = sum(1 for a in aggregated_items if a.severity == "LOW" and a.status != "resolved")
    open_cnt = sum(1 for a in aggregated_items if a.status == "open")
    inp_cnt = sum(1 for a in aggregated_items if a.status == "in_progress")
    res_cnt = sum(1 for a in aggregated_items if a.status == "resolved")

    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    status_order = {"open": 0, "in_progress": 1, "resolved": 2}
    sorted_items = sorted(
        aggregated_items,
        key=lambda x: (status_order.get(x.status, 0), severity_order.get(x.severity, 4))
    )

    return ActionCenterSummary(
        total_actions=len(sorted_items),
        critical_count=crit_cnt,
        high_count=high_cnt,
        medium_count=med_cnt,
        low_count=low_cnt,
        open_count=open_cnt,
        in_progress_count=inp_cnt,
        resolved_count=res_cnt,
        items=sorted_items
    )

def update_action_item(
    item_id: str,
    update_data: ActionItemUpdateRequest,
    user_email: str,
    user_role: str
) -> Optional[ActionItem]:
    db = get_database()
    now_iso = datetime.now(timezone.utc).isoformat()
    update_dict: Dict[str, Any] = {"id": item_id}

    if update_data.status:
        update_dict["status"] = update_data.status
        if update_data.status == "resolved":
            update_dict["resolved_by"] = user_email
            update_dict["resolved_at"] = now_iso

    if update_data.resolution_notes is not None:
        update_dict["resolution_notes"] = update_data.resolution_notes

    if update_data.assignee_name is not None:
        update_dict["assignee_name"] = update_data.assignee_name

    db["action_center_items"].update_one(
        {"$or": [{"id": item_id}, {"_id": item_id}]},
        {"$set": update_dict},
        upsert=True
    )

    record_audit_log(
        user_email=user_email,
        user_role=user_role,
        action="ACTION_ITEM_UPDATE",
        entity_type="action_center_item",
        entity_id=item_id,
        summary=f"Action item {item_id} updated: status={update_data.status or 'unchanged'}, notes={update_data.resolution_notes or ''}",
        payload=update_dict
    )

    summary = get_action_center_items()
    for item in summary.items:
        if item.id == item_id:
            return item
    return None
