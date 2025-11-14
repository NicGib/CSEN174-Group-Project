import { API_BASE_URL, getWebSocketUrl } from '@/src/constants/api';

export interface Message {
  id: number;
  sender_uid: string;
  receiver_uid: string;
  content: string;
  created_at: string;
}

export interface Conversation {
  other_user_uid: string;
  other_user_name?: string;
  last_message?: Message;
  unread_count: number;
}

/**
 * Send a message to another user
 */
export const sendMessage = async (
  senderUid: string,
  receiverUid: string,
  content: string
): Promise<Message> => {
  const response = await fetch(`${API_BASE_URL}/messaging/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-UID': senderUid,
    },
    body: JSON.stringify({
      receiver_uid: receiverUid,
      content,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to send message' }));
    throw new Error(error.detail || 'Failed to send message');
  }

  return response.json();
};

/**
 * Get all conversations for a user
 */
export const getConversations = async (userUid: string): Promise<Conversation[]> => {
  const response = await fetch(`${API_BASE_URL}/messaging/conversations`, {
    method: 'GET',
    headers: {
      'X-User-UID': userUid,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get conversations' }));
    throw new Error(error.detail || 'Failed to get conversations');
  }

  return response.json();
};

/**
 * Get messages in a conversation
 */
export const getConversationMessages = async (
  userUid: string,
  otherUserUid: string,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> => {
  const response = await fetch(
    `${API_BASE_URL}/messaging/conversations/${otherUserUid}/messages?limit=${limit}&offset=${offset}`,
    {
      method: 'GET',
      headers: {
        'X-User-UID': userUid,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get messages' }));
    throw new Error(error.detail || 'Failed to get messages');
  }

  return response.json();
};

/**
 * Create a WebSocket connection for real-time messaging
 */
export class MessagingWebSocket {
  private ws: WebSocket | null = null;
  private userUid: string;
  private onMessage: (message: Message) => void;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(userUid: string, onMessage: (message: Message) => void) {
    this.userUid = userUid;
    this.onMessage = onMessage;
  }

  connect(): void {
    try {
      // Get WebSocket URL dynamically to ensure we use the latest API base URL
      const wsUrl = `${getWebSocketUrl()}/messaging/ws/${this.userUid}`;
      console.log('[MessagingWebSocket] Connecting to:', wsUrl);
      console.log('[MessagingWebSocket] API_BASE_URL:', API_BASE_URL);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[MessagingWebSocket] Connected');
        this.reconnectAttempts = 0;
        // Send ping to keep connection alive
        this.sendPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'pong') {
            // Handle pong response
            return;
          }
          
          if (data.type === 'new_message' && data.message) {
            this.onMessage(data.message);
          }
        } catch (error) {
          console.error('[MessagingWebSocket] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[MessagingWebSocket] Error:', error);
        console.error('[MessagingWebSocket] WebSocket state:', this.ws?.readyState);
        console.error('[MessagingWebSocket] Attempted URL:', wsUrl);
      };

      this.ws.onclose = () => {
        console.log('[MessagingWebSocket] Disconnected');
        this.ws = null;
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[MessagingWebSocket] Connection error:', error);
      this.attemptReconnect();
    }
  }

  private sendPing(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
      // Send ping every 30 seconds to keep connection alive
      setTimeout(() => this.sendPing(), 30000);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`[MessagingWebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('[MessagingWebSocket] Max reconnection attempts reached');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

