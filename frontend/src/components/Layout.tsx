import React, { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  EventNote,
  EventAvailable,
  Queue,
  AdminPanelSettings,
  Logout,
  AccountCircle,
  LocationCity
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 264;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Book Appointment', icon: <EventNote />, path: '/book-appointment' },
    { text: 'My Appointments', icon: <EventAvailable />, path: '/appointments' },
    { text: 'My Queue', icon: <Queue />, path: '/my-queue' }
  ];

  if (isAdmin()) {
    menuItems.push(
      { text: 'Admin Panel', icon: <AdminPanelSettings />, path: '/admin' },
      { text: 'Service Centers', icon: <LocationCity />, path: '/service-centers' }
    );
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', py: 3 }}>
      <Box sx={{ px: 3, pb: 2 }}>
        <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, letterSpacing: 0.3 }}>
          Smart e-National ID
        </Typography>
        <Typography variant="body2" sx={{ color: alpha('#f8fafc', 0.7) }}>
          Citizen experience platform
        </Typography>
      </Box>
      <Divider sx={{ borderColor: alpha('#f8fafc', 0.08), mb: 2 }} />
      <List sx={{ px: 1, flex: 1, display: 'grid', gap: 0.5 }}>
        {menuItems.map((item) => {
          const selected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mt: 0.5 }}>
              <ListItemButton
                selected={selected}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) {
                    setMobileOpen(false);
                  }
                }}
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 1.3,
                  transition: 'all .2s ease-in-out',
                  color: '#e2e8f0',
                  background: selected ? alpha('#60a5fa', 0.16) : 'transparent',
                  boxShadow: selected ? `inset 0 0 0 1px ${alpha('#bfdbfe', 0.4)}` : 'none',
                  '&:hover': {
                    background: alpha('#60a5fa', 0.28)
                  },
                  '&.Mui-selected:hover': {
                    background: alpha('#60a5fa', 0.3)
                  },
                  '& .MuiListItemIcon-root': {
                    color: selected ? '#bfdbfe' : alpha('#e2e8f0', 0.7)
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 42 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: selected ? 600 : 500 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ px: 3, pt: 2 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            background: alpha('#1e293b', 0.85),
            color: '#e2e8f0',
            display: 'grid',
            gap: 1.2
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#cbd5f5', mb: 0.5 }}>
              Need assistance?
            </Typography>
            <Typography variant="body2" sx={{ color: alpha('#e2e8f0', 0.75) }}>
              Track appointments, queues, and manage service centres in one place.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            onClick={() => navigate('/book-appointment')}
          >
            Book Appointment
          </Button>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          background: alpha('#0f172a', 0.78),
          color: '#f8fafc',
          backdropFilter: 'blur(18px)',
          borderBottom: `1px solid ${alpha('#94a3b8', 0.18)}`,
          boxShadow: '0px 10px 30px rgba(15, 23, 42, 0.25)'
        }}
      >
        <Toolbar sx={{ minHeight: 72, px: { xs: 2, md: 4 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" sx={{ color: alpha('#cbd5f5', 0.85) }}>
              Today
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Queue Management Platform
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {user?.first_name} {user?.last_name}
              </Typography>
              <Typography variant="caption" sx={{ color: alpha('#cbd5f5', 0.8) }}>
                {user?.role?.replace('_', ' ')}
              </Typography>
            </Box>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="profile-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              sx={{
                background: alpha('#2563eb', 0.2),
                '&:hover': { background: alpha('#2563eb', 0.3) }
              }}
            >
              <Avatar sx={{ width: 40, height: 40, bgcolor: alpha('#2563eb', 0.9) }}>
                {user?.first_name?.charAt(0)}
                {user?.last_name?.charAt(0)}
              </Avatar>
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth
            }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          px: { xs: 2, md: 4 },
          pb: { xs: 6, md: 8 }
        }}
      >
        <Toolbar sx={{ minHeight: 72 }} />
        {children}
      </Box>

      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { mt: 1, minWidth: 180 } }}
      >
        <MenuItem
          onClick={() => {
            navigate('/profile');
            handleProfileMenuClose();
          }}
        >
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Layout;
