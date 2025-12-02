import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Header
from typing import Optional, List
from sqlalchemy.orm import Session
from ...utils.error_handlers import handle_exceptions
from ...utils.logging_utils import get_logger, log_user_action
from ...messaging.database import get_db, init_db
from ...messaging.service import (
    create_message, 
    get_conversation_messages, 
    get_user_conversations,
    publish_message,
    get_redis
)
from ...schemas.messaging import MessageCreate, MessageOut, ConversationOut
from ...messaging.models import Message

logger = get_logger(__name__)
router = APIRouter(prefix="/messaging", tags=["messaging"])

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        # Map user_uid -> list of WebSocket connections
        self.active_connections: dict[str, list[WebSocket]] = {}
        self.redis_pubsub = None
        
    async def connect(self, websocket: WebSocket, user_uid: str):
        await websocket.accept()
        if user_uid not in self.active_connections:
            self.active_connections[user_uid] = []
        self.active_connections[user_uid].append(websocket)
        
        # Subscribe to Redis channel for this user
        if self.redis_pubsub is None:
            redis_client = get_redis()
            self.redis_pubsub = redis_client.pubsub()
            # Start background task to listen for Redis messages
            asyncio.create_task(self._listen_redis_messages())
    
    def disconnect(self, websocket: WebSocket, user_uid: str):
        if user_uid in self.active_connections:
            self.active_connections[user_uid].remove(websocket)
            if not self.active_connections[user_uid]:
                del self.active_connections[user_uid]
    
    async def send_personal_message(self, message: dict, user_uid: str):
        """Send message to a specific user's WebSocket connections"""
        if user_uid in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_uid]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Error sending message to {user_uid}: {e}", exc_info=True)
                    disconnected.append(connection)
            
            # Remove disconnected connections
            for conn in disconnected:
                self.active_connections[user_uid].remove(conn)
    
    async def _listen_redis_messages(self):
        """Listen for messages from Redis and forward to WebSocket connections"""
        redis_client = get_redis()
        pubsub = redis_client.pubsub()
        
        # Subscribe to all user channels (pattern: user:*)
        pubsub.psubscribe("user:*")
        
        try:
            while True:
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    channel = message["channel"]
                    # Extract user_uid from channel (format: user:{uid} or b'user:{uid}')
                    channel_str = channel.decode() if isinstance(channel, bytes) else channel
                    if channel_str.startswith("user:"):
                        user_uid = channel_str.split(":", 1)[1]
                        try:
                            data_str = message["data"].decode() if isinstance(message["data"], bytes) else message["data"]
                            data = json.loads(data_str)
                            await self.send_personal_message(data, user_uid)
                        except Exception as e:
                            logger.error(f"Error processing Redis message: {e}", exc_info=True)
                await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"Redis listener error: {e}", exc_info=True)

manager = ConnectionManager()

@router.post("/messages", response_model=MessageOut, status_code=201)
@handle_exceptions
async def send_message(
    payload: MessageCreate,
    sender_uid: str = Header(..., alias="X-User-UID", description="UID of the message sender"),
    db: Session = Depends(get_db)
):
    """Send a message to another user"""
    # Create message in database
    message = create_message(db, sender_uid, payload.receiver_uid, payload.content)
    
    # Publish to Redis for real-time delivery
    message_data = {
        "type": "new_message",
        "message": {
            "id": message.id,
            "sender_uid": message.sender_uid,
            "receiver_uid": message.receiver_uid,
            "content": message.content,
            "created_at": message.created_at.isoformat() if message.created_at else None,
        }
    }
    
    # Publish to receiver's channel
    publish_message(f"user:{payload.receiver_uid}", message_data)
    
    # Also notify sender (for confirmation)
    publish_message(f"user:{sender_uid}", message_data)
    
    log_user_action(logger, sender_uid, "send_message", {"receiver_uid": payload.receiver_uid})
    
    return MessageOut(
        id=message.id,
        sender_uid=message.sender_uid,
        receiver_uid=message.receiver_uid,
        content=message.content,
        created_at=message.created_at.isoformat() if message.created_at else None,
    )

@router.get("/conversations", response_model=List[ConversationOut])
@handle_exceptions
async def get_conversations(
    user_uid: str = Header(..., alias="X-User-UID", description="UID of the user"),
    db: Session = Depends(get_db)
):
    """Get all conversations for a user"""
    conversations_data = get_user_conversations(db, user_uid)
    conversations = []
    
    for conv_data in conversations_data:
        last_msg = conv_data["last_message"]
        conversations.append(ConversationOut(
            other_user_uid=conv_data["other_user_uid"],
            last_message=MessageOut(
                id=last_msg.id,
                sender_uid=last_msg.sender_uid,
                receiver_uid=last_msg.receiver_uid,
                content=last_msg.content,
                created_at=last_msg.created_at.isoformat() if last_msg.created_at else None,
            ),
            unread_count=0  # TODO: Implement unread count tracking
        ))
    
    return conversations

@router.get("/conversations/{other_user_uid}/messages", response_model=List[MessageOut])
@handle_exceptions
async def get_messages(
    other_user_uid: str,
    user_uid: str = Header(..., alias="X-User-UID", description="UID of the current user"),
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get messages in a conversation between two users"""
    messages = get_conversation_messages(db, user_uid, other_user_uid, limit, offset)
    return [
        MessageOut(
            id=msg.id,
            sender_uid=msg.sender_uid,
            receiver_uid=msg.receiver_uid,
            content=msg.content,
            created_at=msg.created_at.isoformat() if msg.created_at else None,
        )
        for msg in messages
    ]

@router.websocket("/ws/{user_uid}")
async def websocket_endpoint(websocket: WebSocket, user_uid: str):
    """WebSocket endpoint for real-time messaging"""
    await manager.connect(websocket, user_uid)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                # Handle ping/pong or other client messages if needed
                if message_data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_uid)
    except Exception as e:
        logger.error(f"WebSocket error for {user_uid}: {e}", exc_info=True)
        manager.disconnect(websocket, user_uid)

