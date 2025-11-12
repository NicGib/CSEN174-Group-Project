import os
import json
import redis
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from .models import Message
from ..config import get_redis_url

# Redis connection - uses config loader (checks env vars, config.json, then defaults)
REDIS_URL = get_redis_url()
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

def get_redis():
    """Get Redis client"""
    return redis_client

def publish_message(channel: str, message_data: dict):
    """Publish message to Redis channel"""
    redis_client.publish(channel, json.dumps(message_data))

def create_message(db: Session, sender_uid: str, receiver_uid: str, content: str) -> Message:
    """Create a new message in the database"""
    message = Message(
        sender_uid=sender_uid,
        receiver_uid=receiver_uid,
        content=content
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

def get_conversation_messages(
    db: Session, 
    user1_uid: str, 
    user2_uid: str, 
    limit: int = 50,
    offset: int = 0
) -> List[Message]:
    """Get messages between two users"""
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_uid == user1_uid, Message.receiver_uid == user2_uid),
            and_(Message.sender_uid == user2_uid, Message.receiver_uid == user1_uid)
        )
    ).order_by(desc(Message.created_at)).limit(limit).offset(offset).all()
    
    # Reverse to get chronological order (oldest first)
    return list(reversed(messages))

def get_user_conversations(db: Session, user_uid: str) -> List[Dict]:
    """Get all conversations for a user (list of other users they've messaged with)"""
    # Get distinct conversation partners
    sent_messages = db.query(Message.receiver_uid).filter(Message.sender_uid == user_uid).distinct().all()
    received_messages = db.query(Message.sender_uid).filter(Message.receiver_uid == user_uid).distinct().all()
    
    # Combine and get unique UIDs
    partner_uids = set()
    for row in sent_messages:
        partner_uids.add(row[0])
    for row in received_messages:
        partner_uids.add(row[0])
    
    # Get last message for each conversation
    conversations = []
    for partner_uid in partner_uids:
        last_message = db.query(Message).filter(
            or_(
                and_(Message.sender_uid == user_uid, Message.receiver_uid == partner_uid),
                and_(Message.sender_uid == partner_uid, Message.receiver_uid == user_uid)
            )
        ).order_by(desc(Message.created_at)).first()
        
        if last_message:
            conversations.append({
                "other_user_uid": partner_uid,
                "last_message": last_message
            })
    
    # Sort by last message time (most recent first)
    conversations.sort(key=lambda x: x["last_message"].created_at, reverse=True)
    
    return conversations

