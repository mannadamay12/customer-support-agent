import React from 'react';
import { 
  Drawer, 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton, 
  Divider,
  Button,
  useTheme
} from '@mui/material';
import { 
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  ErrorOutline as ErrorIcon,
  InfoOutlined as InfoIcon,
  Comment as CommentIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/router';
import useNotificationStore from '@/store/notificationStore';
import { Notification, NotificationType } from '@/types';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const router = useRouter();
  const { notifications, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore();
  
  // Get icon based on notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'ESCALATION':
        return <ErrorIcon color="error" />;
      case 'NEW_INQUIRY':
        return <NotificationsActiveIcon color="primary" />;
      case 'NEW_RESPONSE':
        return <CommentIcon color="info" />;
      case 'STATUS_CHANGE':
        return <InfoIcon color="success" />;
      default:
        return <NotificationsIcon />;
    }
  };
  
  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate to the entity
    if (notification.entityType === 'inquiry') {
      router.push(`/inquiries/${notification.entityId}`);
    } else if (notification.entityType === 'response') {
      // Find the associated inquiry ID and navigate to it
      router.push(`/inquiries/${notification.entityId}`);
    }
    
    onClose();
  };
  
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
    >
      <Box sx={{ width: 350, maxWidth: '100%' }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText
        }}>
          <Typography variant="h6">Notifications</Typography>
          <IconButton color="inherit" onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
        
        {/* Actions */}
        <Box sx={{ 
          p: 1, 
          display: 'flex', 
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Button 
            variant="text" 
            size="small"
            onClick={markAllAsRead}
          >
            Mark all as read
          </Button>
          <Button 
            variant="text" 
            size="small" 
            color="error"
            onClick={clearNotifications}
          >
            Clear all
          </Button>
        </Box>
        
        {/* Notification List */}
        <List sx={{ width: '100%', maxHeight: 'calc(100vh - 120px)', overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 48, color: theme.palette.text.disabled, mb: 2 }} />
              <Typography variant="body1" color="textSecondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <React.Fragment key={notification.id}>
                <ListItem 
                  alignItems="flex-start"
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: notification.read ? 'transparent' : theme.palette.action.hover
                  }}
                >
                  <Box sx={{ mr: 2, mt: 1 }}>
                    {getNotificationIcon(notification.type)}
                  </Box>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="subtitle2" 
                        color="textPrimary"
                        sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}
                      >
                        {notification.message}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        component="span"
                      >
                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                      </Typography>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))
          )}
        </List>
      </Box>
    </Drawer>
  );
};

export default NotificationPanel;