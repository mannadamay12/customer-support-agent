import React, { useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Container, 
  CssBaseline,
  useTheme,
  IconButton,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Dashboard as DashboardIcon,
  QuestionAnswer as InquiriesIcon,
  SupervisorAccount as AgentsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as UserIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import NotificationPanel from '../notifications/NotificationPanel';
import useAuthStore from '@/store/authStore';
import useNotificationStore from '@/store/notificationStore';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title = 'AI Customer Support' }) => {
  const theme = useTheme();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  
  const { user, isAuthenticated, logout } = useAuthStore();
  const { 
    unreadCount, 
    initializeWebSocket, 
    disconnectWebSocket 
  } = useNotificationStore();
  
  // Initialize WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      initializeWebSocket();
    }
    
    return () => {
      disconnectWebSocket();
    };
  }, [isAuthenticated, initializeWebSocket, disconnectWebSocket]);
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleNotificationsToggle = () => {
    setNotificationsOpen(!notificationsOpen);
  };
  
  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  const navigationItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      adminOnly: false
    },
    {
      text: 'My Inquiries',
      icon: <InquiriesIcon />,
      path: '/inquiries',
      adminOnly: false
    },
    {
      text: 'Agent Dashboard',
      icon: <AgentsIcon />,
      path: '/agent-dashboard',
      adminOnly: true
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
      adminOnly: false
    },
  ];
  
  // Filter admin-only items if user is not admin
  const filteredItems = navigationItems.filter(
    item => !item.adminOnly || (user?.is_admin ?? false)
  );
  
  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText
      }}>
        <UserIcon sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="subtitle1">
          {user ? user.name : 'Guest'}
        </Typography>
        <Typography variant="body2">
          {user ? user.email : ''}
        </Typography>
      </Box>
      <Divider />
      <List>
        {filteredItems.map((item) => (
          <ListItem 
            button 
            key={item.text}
            onClick={() => {
              router.push(item.path);
              setDrawerOpen(false);
            }}
            selected={router.pathname === item.path}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );
  
  // If not authenticated, only render children (login/register pages)
  if (!isAuthenticated) {
    return (
      <>
        <CssBaseline />
        {children}
      </>
    );
  }
  
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          
          <IconButton color="inherit" onClick={handleNotificationsToggle}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Navigation Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
      >
        {drawer}
      </Drawer>
      
      {/* Notifications Panel */}
      <NotificationPanel 
        open={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
      />
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: '100%',
          marginTop: '64px', // AppBar height
          bgcolor: theme.palette.background.default
        }}
      >
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;