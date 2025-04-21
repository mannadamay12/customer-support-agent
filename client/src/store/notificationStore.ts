import { create } from 'zustand';
import { Notification } from '@/types';
import websocketService from '@/services/websocket';
import useAuthStore from './authStore';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  
  // WebSocket integration
  initializeWebSocket: () => void;
  disconnectWebSocket: () => void;
}

const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  // Actions
  addNotification: (notification: Notification) => {
    set(state => {
      // Ensure we don't add duplicates
      const isDuplicate = state.notifications.some(n => n.id === notification.id);
      
      if (isDuplicate) {
        return state;
      }
      
      const newNotifications = [notification, ...state.notifications].slice(0, 100); // Limit to 100 notifications
      return {
        notifications: newNotifications,
        unreadCount: state.unreadCount + (notification.read ? 0 : 1)
      };
    });
  },
  
  markAsRead: (id: string) => {
    set(state => {
      const updatedNotifications = state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      
      // Calculate new unread count
      const unreadCount = updatedNotifications.filter(n => !n.read).length;
      
      return {
        notifications: updatedNotifications,
        unreadCount
      };
    });
  },
  
  markAllAsRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
  },
  
  clearNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0
    });
  },
  
  // WebSocket integration
  initializeWebSocket: () => {
    const token = useAuthStore.getState().token;
    
    if (!token) {
      console.error('Cannot initialize WebSocket: No authentication token');
      return;
    }
    
    // Connect to WebSocket server
    websocketService.connect(token);
    
    // Setup notification handler
    websocketService.on<Notification>('notification', (notification) => {
      get().addNotification(notification);
    });
    
    // Setup escalation handler (creates notification)
    websocketService.on('escalation', (data) => {
      const { inquiry, reason } = data;
      const notification: Notification = {
        id: `escalation-${inquiry.id}-${Date.now()}`,
        type: 'ESCALATION',
        message: `Inquiry #${inquiry.id} "${inquiry.subject}" has been escalated: ${reason}`,
        entityId: inquiry.id,
        entityType: 'inquiry',
        timestamp: new Date().toISOString(),
        read: false
      };
      
      get().addNotification(notification);
    });
    
    // Setup new inquiry handler
    websocketService.on('new_inquiry', (inquiry) => {
      const notification: Notification = {
        id: `new-inquiry-${inquiry.id}`,
        type: 'NEW_INQUIRY',
        message: `New inquiry #${inquiry.id}: "${inquiry.subject}"`,
        entityId: inquiry.id,
        entityType: 'inquiry',
        timestamp: new Date().toISOString(),
        read: false
      };
      
      get().addNotification(notification);
    });
    
    // Setup new response handler
    websocketService.on('new_response', (response) => {
      const notification: Notification = {
        id: `new-response-${response.id}`,
        type: 'NEW_RESPONSE',
        message: `New response for inquiry #${response.inquiry_id}`,
        entityId: response.inquiry_id,
        entityType: 'inquiry',
        timestamp: new Date().toISOString(),
        read: false
      };
      
      get().addNotification(notification);
    });
    
    // Join agent room if user is an admin
    const user = useAuthStore.getState().user;
    if (user?.is_admin) {
      websocketService.joinRoom('agents');
    }
  },
  
  disconnectWebSocket: () => {
    websocketService.disconnect();
  }
}));

export default useNotificationStore;