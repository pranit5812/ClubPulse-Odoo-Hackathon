from typing import Optional
from pydantic import BaseModel, Field

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = ""
    event_id: Optional[str] = None
    department: Optional[str] = "Operations"
    assignment_role: Optional[str] = "Volunteer"  # Head, Sub-head, Volunteer
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    due_date: str  # YYYY-MM-DD
    priority: str = "medium"  # low, medium, high, critical
    is_critical_path: bool = False
    status: str = "todo"  # todo, in_progress, done

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_id: Optional[str] = None
    department: Optional[str] = None
    assignment_role: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    is_critical_path: Optional[bool] = None
    status: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    event_id: Optional[str] = None
    event_title: Optional[str] = None
    department: Optional[str] = "Operations"
    assignment_role: Optional[str] = "Volunteer"
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    due_date: str
    priority: str
    is_critical_path: bool
    status: str
    is_overdue: bool
    created_at: str
