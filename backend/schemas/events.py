from pydantic import BaseModel, Field, constr
from typing import List, Optional
from datetime import datetime

class EventCreate(BaseModel):
    title: constr(strip_whitespace=True, min_length=1)
    location: constr(strip_whitespace=True, min_length=1)
    event_date: str  # accepts "YYYY-MM-DD" or ISO string; parsing happens in the service layer
    description: Optional[str] = ""
    max_attendees: int = Field(default=20, gt=0)
    difficulty_level: str = Field(default="beginner", pattern="^(beginner|intermediate|advanced)$")
    organizer_uid: str = Field(..., min_length=1, description="UID of the event organizer (required)")

class EventOut(BaseModel):
    success: bool
    event_id: str
    title: str
    location: str
    event_date: str
    description: str
    max_attendees: int
    difficulty_level: str
    organizer_uid: str
    attendees: List[str]
    message: str
    timestamp: str

class EventDetails(BaseModel):
    event_id: str
    title: str
    location: str
    event_date: str
    description: str
    max_attendees: int
    difficulty_level: str
    organizer_uid: str
    attendees: List[str] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class AttendeeAdd(BaseModel):
    user_uid: str
    user_name: Optional[str] = ""

class EventDeleteResponse(BaseModel):
    success: bool
    event_id: str
    message: str
    timestamp: str