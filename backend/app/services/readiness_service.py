import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.database.mongodb import get_database
from app.schemas.readiness import (
    ReadinessCategoryScore,
    ReadinessTimelineItem,
    EventReadinessDetail,
    EventReadinessSummary
)

CATEGORY_WEIGHTS = {
    "financial": 0.25,
    "volunteers": 0.25,
    "capacity": 0.20,
    "tasks": 0.20,
    "resources": 0.10
}

def calculate_event_readiness(event_id: str) -> Optional[EventReadinessDetail]:
    db = get_database()
    event = db["events"].find_one({"$or": [{"id": event_id}, {"_id": event_id}]})
    if not event:
        return None

    actual_event_id = str(event.get("id") or event.get("_id"))
    now = datetime.now(timezone.utc)
    event_date_str = str(event.get("event_date") or event.get("date") or "")
    days_remaining = 0
    try:
        clean_date_str = event_date_str.split(" ")[0].split("T")[0]
        event_dt = datetime.strptime(clean_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        days_remaining = (event_dt - now).days
    except Exception:
        days_remaining = 7

    # 1. Fetch relevant records
    tickets = list(db["tickets"].find({"event_id": actual_event_id}))
    tickets_sold = len(tickets) if tickets else int(event.get("booked_count", 0))
    ticket_revenue_paise = sum(t.get("total_amount_paise", 0) for t in tickets) if tickets else (
        tickets_sold * int(event.get("member_price_paise", 0))
    )
    capacity = int(event.get("capacity", 0))

    # Expenses & Transactions
    expenses = list(db["expenses"].find({"event_id": actual_event_id}))
    total_expenses_paise = sum(e.get("amount_paise", 0) for e in expenses)
    pending_reimbursements_paise = sum(
        e.get("amount_paise", 0) for e in expenses if e.get("status") in ["pending", "submitted"]
    )
    budget_paise = int(event.get("estimated_budget_paise") or event.get("budget_paise") or 0)

    # Tasks
    tasks = list(db["tasks"].find({"event_id": actual_event_id}))
    total_tasks = len(tasks)
    done_tasks = sum(1 for t in tasks if t.get("status") in ["completed", "done"])
    unassigned_tasks = sum(1 for t in tasks if not t.get("assignee_id"))
    overdue_tasks = 0
    critical_overdue = 0

    for t in tasks:
        due_str = t.get("due_date", "")
        if due_str and t.get("status") not in ["completed", "done"]:
            try:
                due_dt = datetime.strptime(due_str.split("T")[0], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if due_dt < now:
                    overdue_tasks += 1
                    if days_remaining <= 3 or t.get("priority") in ["critical", "urgent"]:
                        critical_overdue += 1
            except Exception:
                pass

    # Products / Merch
    products = list(db["products"].find())
    low_stock_merch = 0
    for p in products:
        stock = p.get("stock_quantity")
        if stock is None and "sizes" in p:
            stock = sum(s.get("stock", 0) for s in p["sizes"])
        if (stock or 0) <= 5:
            low_stock_merch += 1

    category_scores: List[ReadinessCategoryScore] = []
    critical_blockers: List[str] = []

    # Category 1: Financial Readiness
    fin_blockers = []
    if budget_paise == 0:
        fin_score = 40
        fin_status = "missing_data"
        fin_blockers.append("Event budget has not been configured")
        fin_action = "Define event budget in event management workspace."
    else:
        spent_ratio = total_expenses_paise / budget_paise if budget_paise > 0 else 0
        revenue_cover_ratio = ticket_revenue_paise / total_expenses_paise if total_expenses_paise > 0 else 1.0

        if spent_ratio > 1.0:
            fin_score = max(20, int(60 - (spent_ratio - 1.0) * 100))
            fin_status = "critical"
            fin_blockers.append(f"Expenses (₹{total_expenses_paise/100:.0f}) exceed budgeted amount (₹{budget_paise/100:.0f})")
            fin_action = "Halt unapproved discretionary spending and review emergency contingency."
        elif pending_reimbursements_paise > (budget_paise * 0.3):
            fin_score = 65
            fin_status = "warning"
            fin_blockers.append(f"Substantial pending reimbursements: ₹{pending_reimbursements_paise/100:.0f}")
            fin_action = "Treasurer review and clear pending reimbursements."
        else:
            fin_score = min(100, int(80 + (20 * min(revenue_cover_ratio, 1.0))))
            fin_status = "optimal"
            fin_action = "Financial baseline is healthy and within projected thresholds."

    if fin_status == "critical":
        critical_blockers.extend(fin_blockers)

    category_scores.append(ReadinessCategoryScore(
        category="financial",
        title="Financial Health & Budget",
        score=fin_score,
        weight=CATEGORY_WEIGHTS["financial"],
        status=fin_status,
        evidence={
            "budget_paise": budget_paise,
            "total_expenses_paise": total_expenses_paise,
            "ticket_revenue_paise": ticket_revenue_paise,
            "pending_reimbursements_paise": pending_reimbursements_paise
        },
        blockers=fin_blockers,
        recommended_action=fin_action
    ))

    # Category 2: Volunteer Coverage
    vol_blockers = []
    assigned_tasks = total_tasks - unassigned_tasks
    required_volunteers = int(event.get("required_volunteer_count", 5))

    if total_tasks == 0:
        vol_score = 45
        vol_status = "missing_data"
        vol_blockers.append(f"No volunteer tasks configured (requires {required_volunteers} volunteers)")
        vol_action = "Create role-specific volunteer task rosters (check-in, ushering, logistics)."
    else:
        coverage_ratio = assigned_tasks / total_tasks
        if coverage_ratio < 0.4 and days_remaining <= 3:
            vol_score = 25
            vol_status = "critical"
            vol_blockers.append(f"Severe volunteer shortage: {unassigned_tasks} of {total_tasks} tasks unassigned with {days_remaining}d remaining")
            vol_action = "Broadcast urgent volunteer callout to active members."
        elif coverage_ratio < 0.7:
            vol_score = 65
            vol_status = "warning"
            vol_blockers.append(f"{unassigned_tasks} volunteer slots remain unassigned")
            vol_action = "Assign executive or active members to remaining slots."
        else:
            vol_score = int(70 + 30 * coverage_ratio)
            vol_status = "optimal"
            vol_action = "Volunteer coverage roster is appropriately staffed."

    if vol_status == "critical":
        critical_blockers.extend(vol_blockers)

    category_scores.append(ReadinessCategoryScore(
        category="volunteers",
        title="Volunteer Coverage & Staffing",
        score=vol_score,
        weight=CATEGORY_WEIGHTS["volunteers"],
        status=vol_status,
        evidence={
            "total_tasks": total_tasks,
            "assigned_tasks": assigned_tasks,
            "unassigned_tasks": unassigned_tasks,
            "required_volunteers": required_volunteers,
            "coverage_pct": round((assigned_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0
        },
        blockers=vol_blockers,
        recommended_action=vol_action
    ))

    # Category 3: Ticket & Capacity Readiness
    cap_blockers = []
    if capacity <= 0:
        cap_score = 50
        cap_status = "missing_data"
        cap_blockers.append("Venue capacity limit not configured")
        cap_action = "Specify venue maximum occupancy in event settings."
    else:
        capacity_fill_pct = (tickets_sold / capacity) * 100
        if capacity_fill_pct > 100:
            cap_score = 30
            cap_status = "critical"
            cap_blockers.append(f"Overcapacity risk: {tickets_sold} tickets issued for {capacity} capacity")
            cap_action = "Freeze ticket booking immediately and adjust venue logistics."
        elif capacity_fill_pct < 20 and days_remaining <= 2:
            cap_score = 55
            cap_status = "warning"
            cap_blockers.append(f"Low attendance velocity: Only {tickets_sold}/{capacity} tickets issued ({capacity_fill_pct:.1f}%)")
            cap_action = "Publish campus announcements and launch student social promotions."
        else:
            cap_score = min(100, int(60 + min(capacity_fill_pct, 100) * 0.4))
            cap_status = "optimal"
            cap_action = "Ticket registration velocity matches operational target."

    if cap_status == "critical":
        critical_blockers.extend(cap_blockers)

    category_scores.append(ReadinessCategoryScore(
        category="capacity",
        title="Ticket Sales & Capacity",
        score=cap_score,
        weight=CATEGORY_WEIGHTS["capacity"],
        status=cap_status,
        evidence={
            "capacity": capacity,
            "tickets_sold": tickets_sold,
            "capacity_fill_pct": round((tickets_sold / capacity * 100), 1) if capacity > 0 else 0
        },
        blockers=cap_blockers,
        recommended_action=cap_action
    ))

    # Category 4: Task Completion & Critical Path
    task_blockers = []
    if total_tasks == 0:
        task_score = 60
        task_status = "missing_data"
        task_action = "Populate operational milestones and assign owners."
    else:
        completion_ratio = done_tasks / total_tasks
        if critical_overdue > 0:
            task_score = 35
            task_status = "critical"
            task_blockers.append(f"{critical_overdue} critical tasks are overdue within operational readiness window")
            task_action = "Expedite overdue critical tasks immediately."
        elif overdue_tasks > 0:
            task_score = 60
            task_status = "warning"
            task_blockers.append(f"{overdue_tasks} overdue tasks requiring resolution")
            task_action = "Review task backlog and reassign bottleneck tasks."
        else:
            task_score = int(60 + 40 * completion_ratio)
            task_status = "optimal"
            task_action = "Milestone executions are on schedule."

    if task_status == "critical":
        critical_blockers.extend(task_blockers)

    category_scores.append(ReadinessCategoryScore(
        category="tasks",
        title="Milestone Execution & Tasks",
        score=task_score,
        weight=CATEGORY_WEIGHTS["tasks"],
        status=task_status,
        evidence={
            "total_tasks": total_tasks,
            "done_tasks": done_tasks,
            "overdue_tasks": overdue_tasks,
            "critical_overdue": critical_overdue
        },
        blockers=task_blockers,
        recommended_action=task_action
    ))

    # Category 5: Resources & Merch
    res_blockers = []
    if low_stock_merch > 0:
        res_score = 75
        res_status = "warning"
        res_blockers.append(f"{low_stock_merch} merchandise items running below safety stock buffer")
        res_action = "Check physical merchandise inventory before booth setup."
    else:
        res_score = 95
        res_status = "optimal"
        res_action = "Materials, assets, and merchandise ready for deployment."

    category_scores.append(ReadinessCategoryScore(
        category="resources",
        title="Resource & Asset Buffer",
        score=res_score,
        weight=CATEGORY_WEIGHTS["resources"],
        status=res_status,
        evidence={"low_stock_merch_count": low_stock_merch},
        blockers=res_blockers,
        recommended_action=res_action
    ))

    # Weighted Overall Score
    raw_overall = sum(cat.score * cat.weight for cat in category_scores)
    overall_score = max(0, min(100, int(round(raw_overall))))

    if len(critical_blockers) > 0 or overall_score < 50:
        overall_status = "at_risk"
    elif overall_score < 75 or any(cat.status == "warning" for cat in category_scores):
        overall_status = "attention_required"
    else:
        overall_status = "ready"

    # Build Timeline items
    timeline: List[ReadinessTimelineItem] = []
    for t in sorted(tasks, key=lambda x: x.get("due_date", "9999")):
        due_str = t.get("due_date", event_date_str)
        t_status = "done" if t.get("status") in ["completed", "done"] else "pending"
        try:
            due_dt = datetime.strptime(due_str.split("T")[0], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if due_dt < now and t_status == "pending":
                t_status = "overdue"
            days_until = (due_dt - now).days
        except Exception:
            days_until = days_remaining

        timeline.append(ReadinessTimelineItem(
            id=str(t.get("id") or t.get("_id")),
            title=t.get("title", "Task"),
            due_date=due_str,
            category=t.get("category", "operations"),
            status=t_status,
            is_critical_path=bool(t.get("is_critical_path")) or t.get("priority") in ["critical", "high"] or days_until <= 2,
            assignee_name=t.get("assignee_name"),
            days_until_event=days_remaining
        ))

    return EventReadinessDetail(
        event_id=actual_event_id,
        event_title=event.get("title", "Untitled Event"),
        event_date=event_date_str,
        venue=event.get("venue", "TBD"),
        days_remaining=days_remaining,
        overall_readiness_score=overall_score,
        overall_status=overall_status,
        critical_blockers_count=len(critical_blockers),
        category_scores=category_scores,
        timeline=timeline,
        formula_explanation="Readiness = 0.25*Financial + 0.25*Volunteers + 0.20*Capacity + 0.20*Tasks + 0.10*Resources. Penalized for overdue critical tasks and overcapacity.",
        weights_used=CATEGORY_WEIGHTS,
        evaluated_at=now.isoformat()
    )

def list_events_readiness_summary() -> List[EventReadinessSummary]:
    db = get_database()
    events = list(db["events"].find().sort("event_date", 1))
    summaries: List[EventReadinessSummary] = []
    for event in events:
        eid = str(event.get("id") or event.get("_id"))
        detail = calculate_event_readiness(eid)
        if detail:
            top_b = None
            for c in detail.category_scores:
                if c.blockers:
                    top_b = c.blockers[0]
                    break
            summaries.append(EventReadinessSummary(
                event_id=detail.event_id,
                event_title=detail.event_title,
                event_date=detail.event_date,
                days_remaining=detail.days_remaining,
                overall_readiness_score=detail.overall_readiness_score,
                overall_status=detail.overall_status,
                critical_blockers_count=detail.critical_blockers_count,
                top_blocker=top_b
            ))
    return summaries
