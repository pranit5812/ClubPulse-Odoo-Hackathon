from typing import Optional
from pydantic import BaseModel, Field

class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=3)
    content: str
    target_audience: str = "all"  # all, members_only, organizers
    priority: str = "normal"  # normal, high, urgent
    is_published: bool = True

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    target_audience: Optional[str] = None
    priority: Optional[str] = None
    is_published: Optional[bool] = None

class AnnouncementResponse(BaseModel):
    id: str
    title: str
    content: str
    target_audience: str
    priority: str
    is_published: bool
    author_id: str
    author_name: str
    created_at: str
    updated_at: str
