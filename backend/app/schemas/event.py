from typing import Optional, List
from pydantic import BaseModel, Field, model_validator

class EventCreate(BaseModel):
    title: str = Field(..., min_length=3)
    description: str = ""
    venue: str = Field(..., min_length=2)
    event_date: str  # Start date and time (ISO or YYYY-MM-DD HH:MM)
    end_date: Optional[str] = None  # End date and time
    capacity: int = Field(..., gt=0)
    member_price_paise: int = Field(default=0, ge=0)
    non_member_price_paise: int = Field(default=10000, ge=0)  # ₹100
    banner_url: Optional[str] = None
    tags: List[str] = []
    is_published: bool = True
    is_ended: bool = False
    status: str = "upcoming"
    required_volunteer_count: int = Field(default=5, ge=2)
    estimated_budget_paise: int = Field(default=2000000, ge=0)  # ₹20,000

    @model_validator(mode="after")
    def validate_event_create(self):
        if self.required_volunteer_count < 2:
            raise ValueError("A minimum of 2 volunteers is required (less than 2 is not permitted).")
        if self.end_date and self.event_date and self.end_date.strip() < self.event_date.strip():
            raise ValueError("End date and time cannot be earlier than start date and time.")
        if self.banner_url and self.banner_url.strip():
            clean_url = self.banner_url.strip()
            if not (clean_url.startswith("http://") or clean_url.startswith("https://") or clean_url.startswith("/") or clean_url.startswith("data:image/")):
                raise ValueError("Banner image URL must start with http://, https://, /, or be a valid uploaded image.")
        return self

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    venue: Optional[str] = None
    event_date: Optional[str] = None
    end_date: Optional[str] = None
    capacity: Optional[int] = None
    member_price_paise: Optional[int] = None
    non_member_price_paise: Optional[int] = None
    banner_url: Optional[str] = None
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None
    is_ended: Optional[bool] = None
    status: Optional[str] = None
    required_volunteer_count: Optional[int] = None
    estimated_budget_paise: Optional[int] = None

    @model_validator(mode="after")
    def validate_event_update(self):
        if self.capacity is not None and self.capacity < 1:
            raise ValueError("Seating capacity must be at least 1.")
        if self.member_price_paise is not None and self.member_price_paise < 0:
            raise ValueError("Member price cannot be negative.")
        if self.non_member_price_paise is not None and self.non_member_price_paise < 0:
            raise ValueError("Non-member price cannot be negative.")
        if self.estimated_budget_paise is not None and self.estimated_budget_paise < 0:
            raise ValueError("Estimated budget cannot be negative.")
        if self.required_volunteer_count is not None and self.required_volunteer_count < 2:
            raise ValueError("A minimum of 2 volunteers is required (less than 2 is not permitted).")
        if self.end_date and self.event_date and self.end_date.strip() < self.event_date.strip():
            raise ValueError("End date and time cannot be earlier than start date and time.")
        if self.banner_url and self.banner_url.strip():
            clean_url = self.banner_url.strip()
            if not (clean_url.startswith("http://") or clean_url.startswith("https://") or clean_url.startswith("/") or clean_url.startswith("data:image/")):
                raise ValueError("Banner image URL must start with http://, https://, /, or be a valid uploaded image.")
        return self

class EventResponse(BaseModel):
    id: str
    title: str
    description: str
    venue: str
    event_date: str
    end_date: Optional[str] = None
    capacity: int
    booked_count: int
    checked_in_count: int
    member_price_paise: int
    non_member_price_paise: int
    banner_url: Optional[str] = None
    tags: List[str] = []
    is_published: bool
    is_ended: bool = False
    status: str = "upcoming"
    ended_at: Optional[str] = None
    required_volunteer_count: int
    estimated_budget_paise: int
    created_at: str
