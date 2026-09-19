import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';

const drawerWidth = 252;
const navigation = [
  { label: 'Menu items', path: '/menu/items', icon: <RestaurantMenuRoundedIcon /> },
  { label: 'Categories', path: '/menu/categories', icon: <CategoryOutlinedIcon /> },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', px: 2, py: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1, mb: 3.5 }}>
        <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
          <MenuBookOutlinedIcon />
        </Box>
        <Box>
          <Typography variant="h6" lineHeight={1}>Tasty</Typography>
          <Typography variant="body2" color="text.secondary">Station</Typography>
        </Box>
      </Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 1.5, mb: 1 }}>Management</Typography>
      <List sx={{ p: 0 }}>
        {navigation.map((item) => {
          const selected = location.pathname.startsWith(item.path);
          return (
            <ListItemButton key={item.path} selected={selected} onClick={() => { navigate(item.path); setMobileOpen(false); }}
              sx={{ borderRadius: 2.5, mb: 0.75, '&.Mui-selected': { bgcolor: 'primary.light', color: 'primary.dark' } }}>
              <ListItemIcon sx={{ minWidth: 40, color: selected ? 'primary.main' : 'text.secondary' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: selected ? 700 : 500 }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ mt: 'auto', p: 1.5, borderRadius: 3, bgcolor: 'primary.light' }}>
        <Typography fontWeight={700} variant="body2">Menu workspace</Typography>
        <Typography variant="caption" color="text.secondary">Manage what your guests can order.</Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ ml: { md: `${drawerWidth}px` }, width: { md: `calc(100% - ${drawerWidth}px)` }, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,.9)', backdropFilter: 'blur(14px)' }}>
        <Toolbar sx={{ gap: 1.5 }}>
          {!desktop && <IconButton onClick={() => setMobileOpen(true)} aria-label="Open navigation"><MenuRoundedIcon /></IconButton>}
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={750}>Restaurant Management</Typography>
            <Typography variant="caption" color="text.secondary">Menu administration</Typography>
          </Box>
          <Tooltip title="Notifications"><IconButton><NotificationsNoneRoundedIcon /></IconButton></Tooltip>
          <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />
          <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}>A</Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" fontWeight={700}>Administrator</Typography>
            <Typography variant="caption" color="text.secondary">Menu manager</Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer variant={desktop ? 'permanent' : 'temporary'} open={desktop || mobileOpen} onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: drawerWidth, borderRight: '1px solid', borderColor: 'divider' } }}>
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flex: 1, minWidth: 0, pt: 10, px: { xs: 2, sm: 3, lg: 4 }, pb: 5 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
