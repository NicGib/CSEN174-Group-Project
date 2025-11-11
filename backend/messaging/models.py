from sqlalchemy import Column, String, Text, DateTime, Integer, Index
from sqlalchemy.sql import func
from .database import Base

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_uid = Column(String(255), nullable=False, index=True)
    receiver_uid = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Composite index for efficient conversation queries
    __table_args__ = (
        Index('idx_conversation', 'sender_uid', 'receiver_uid', 'created_at'),
    )
    
    def to_dict(self):
        return {
            "id": self.id,
            "sender_uid": self.sender_uid,
            "receiver_uid": self.receiver_uid,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

