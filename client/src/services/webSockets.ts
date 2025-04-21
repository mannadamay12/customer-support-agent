import { io, Socket } from 'socket.io-client';
import { Notification, Inquiry, Response } from '@/types';

// Event types
type WebSocketEvent = 
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'new_inquiry'
  | 'inquiry_updated'
  | 'new_response'
  | 'escalation'
  | 'notification';

// Event handler type
type EventHandler<T = any> = (data: T) => void;

// WebSocket service class
class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<WebSocketEvent, EventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // ms
  
  // Connect to WebSocket server
  connect(token: string): void {
    if (this.socket) {
      console.warn('WebSocket already connected');
      return;
    }
    
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    
    this.socket = io(wsUrl, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });
    
    // Setup default event handlers
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.triggerEvent('connect');
    });
    
    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.triggerEvent('disconnect');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.triggerEvent('error', error);
      
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnect attempts reached');
        this.disconnect();
      }
    });
    
    // Setup application event handlers
    this.socket.on('new_inquiry', (data: Inquiry) => {
      this.triggerEvent('new_inquiry', data);
    });
    
    this.socket.on('inquiry_updated', (data: Inquiry) => {
      this.triggerEvent('inquiry_updated', data);
    });
    
    this.socket.on('new_response', (data: Response) => {
      this.triggerEvent('new_response', data);
    });
    
    this.socket.on('escalation', (data: { inquiry: Inquiry; reason: string }) => {
      this.triggerEvent('escalation', data);
    });
    
    this.socket.on('notification', (data: Notification) => {
      this.triggerEvent('notification', data);
    });
  }
  
  // Disconnect from WebSocket server
  disconnect(): void {
    if (!this.socket) {
      return;
    }
    
    this.socket.disconnect();
    this.socket = null;
  }
  
  // Add event handler
  on<T = any>(event: WebSocketEvent, handler: EventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    
    this.eventHandlers.get(event)?.push(handler as EventHandler);
  }
  
  // Remove event handler
  off(event: WebSocketEvent, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      return;
    }
    
    const handlers = this.eventHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  // Trigger event handlers
  private triggerEvent(event: WebSocketEvent, data?: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    });
  }
  
  // Join a specific room (e.g., for agent dashboard)
  joinRoom(room: string): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    
    this.socket.emit('join', { room });
  }
  
  // Leave a specific room
  leaveRoom(room: string): void {
    if (!this.socket) {
      return;
    }
    
    this.socket.emit('leave', { room });
  }
  
  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;