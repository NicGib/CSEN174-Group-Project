from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class MessageCreate(BaseModel):
    receiver_uid: str = Field(..., description="UID of the message receiver")
    content: str = Field(..., min_length=1, max_length=5000, description="Message content")

class MessageOut(BaseModel):
    id: int
    sender_uid: str
    receiver_uid: str
    content: str
    created_at: str
    
    class Config:
        from_attributes = True

class ConversationOut(BaseModel):
    other_user_uid: str
    other_user_name: Optional[str] = None
    last_message: Optional[MessageOut] = None
    unread_count: int = 0

