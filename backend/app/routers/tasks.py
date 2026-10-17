from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.services.task_service import TaskService
from app.core.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/api/tasks", tags=["Tasks & Volunteers"])

@router.get("", response_model=List[TaskResponse])
def list_tasks(
    event_id: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    return TaskService.list_tasks(event_id=event_id, assignee_id=assignee_id)

@router.get("/department-assignments")
def get_department_assignments(
    event_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    return TaskService.get_department_assignments(event_id=event_id)

@router.post("", response_model=TaskResponse)
def create_task(
    data: TaskCreate,
    current_user: dict = Depends(require_roles(["organizer", "treasurer", "admin"]))
):
    return TaskService.create_task(data, current_user=current_user)

@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    return TaskService.update_task(task_id, data, current_user=current_user)
