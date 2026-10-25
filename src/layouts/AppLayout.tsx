import { useAuth } from '../features/authentication/useAuth';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useState, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Avatar, Box, Collapse, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import RoomOutlinedIcon from '@mui/icons-material/RoomOutlined';
import SoupKitchenOutlinedIcon from '@mui/icons-material/SoupKitchenOutlined';
import LocalDiningOutlinedIcon from '@mui/icons-material/LocalDiningOutlined';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';

import TableRestaurantOutlinedIcon from '@mui/icons-material/TableRestaurantOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import { Permissions } from '../features/authentication/permissions';

const drawerWidth = 252;
type NavigationItem = { label: string; path: string; icon: ReactNode; permission?: string };

const dailyNavigation: NavigationItem[] = [
  { label: 'Table dashboard', path: '/restaurant/table-dashboard', icon: <TableRestaurantOutlinedIcon /> },
  { label: 'Kitchen display', path: '/kitchen/display', icon: <LocalDiningOutlinedIcon />, permission: Permissions.kitchenManage },
  { label: 'Billing', path: '/billing', icon: <ReceiptLongOutlinedIcon />, permission: Permissions.billingManage },
];

const masterNavigation: NavigationItem[] = [
  { label: 'Tables', path: '/restaurant/tables', icon: <TableRestaurantOutlinedIcon /> },
  { label: 'Areas', path: '/restaurant/areas', icon: <RoomOutlinedIcon /> },
  { label: 'Menu items', path: '/menu/items', icon: <RestaurantMenuRoundedIcon /> },
  { label: 'Categories', path: '/menu/categories', icon: <CategoryOutlinedIcon /> },
  { label: 'Kitchens', path: '/menu/kitchens', icon: <SoupKitchenOutlinedIcon /> },
  { label: 'Billing settings', path: '/billing/settings', icon: <ReceiptLongOutlinedIcon />, permission: Permissions.billingSettingsManage },
];

export function AppLayout() {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Daily actions': true,
    'Master data': true,
    'Administration': true,
  });
  const navigationGroups = [
    {
      label: 'Daily actions',
      items: [
        dailyNavigation[0],
        ...(hasPermission(Permissions.ordersCreate) || hasPermission(Permissions.ordersSubmit) || hasPermission(Permissions.billingManage)
          ? [{ label: 'Active orders', path: '/orders/active', icon: <RestaurantMenuRoundedIcon />, permission: undefined }] : []),
        ...dailyNavigation.slice(1),
      ],
    },
    { label: 'Master data', items: masterNavigation },
    { label: 'Administration', items: user?.role === 'Admin' || user?.role === 'Manager' ? [
      { label: 'Users', path: '/administration/users', icon: <AdminPanelSettingsOutlinedIcon />, permission: Permissions.usersManage },
      ...(user.role === 'Admin' ? [{ label: 'Access control', path: '/administration/access-control', icon: <AdminPanelSettingsOutlinedIcon />, permission: Permissions.usersManage }] : []),
    ] : [] },
  ].map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((group) => group.items.length > 0);

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
      {navigationGroups.map((group) => (
        <Box component="section" aria-label={group.label} key={group.label} sx={{ mb: 2 }}>
          <ListItemButton component="button" type="button"
            aria-expanded={expandedGroups[group.label] ?? false}
            aria-controls={`navigation-${group.label.replaceAll(' ', '-').toLowerCase()}`}
            onClick={() => setExpandedGroups((current) => ({ ...current, [group.label]: !current[group.label] }))}
            sx={{ width: '100%', borderRadius: 2.5, mb: 0.75, px: 1.5, color: 'text.secondary' }}>
            <ListItemIcon sx={{ minWidth: 28, color: 'inherit' }}>
              {expandedGroups[group.label] ? <ExpandMoreRoundedIcon /> : <ChevronRightRoundedIcon />}
            </ListItemIcon>
            <ListItemText primary={group.label} primaryTypographyProps={{ fontWeight: 700, variant: 'body2' }} />
          </ListItemButton>
          <Collapse in={expandedGroups[group.label] ?? false}
            id={`navigation-${group.label.replaceAll(' ', '-').toLowerCase()}`} unmountOnExit>
          <List aria-label={group.label} sx={{ p: 0 }}>
            {group.items.map((item) => {
              const selected = item.path === '/billing'
                ? location.pathname === '/billing' || location.pathname.startsWith('/billing/orders/')
                : location.pathname.startsWith(item.path);
              return (
                <ListItemButton key={item.path} selected={selected} onClick={() => { navigate(item.path); setMobileOpen(false); }}
                  sx={{ pl: 3, borderRadius: 2.5, mb: 0.75, '&.Mui-selected': { bgcolor: 'primary.light', color: 'primary.dark' } }}>
                  <ListItemIcon sx={{ minWidth: 40, color: selected ? 'primary.main' : 'text.secondary' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: selected ? 700 : 500 }} />
                </ListItemButton>
              );
            })}
          </List>
          </Collapse>
        </Box>
      ))}
      <Box sx={{ mt: 'auto', p: 1.5, borderRadius: 3, bgcolor: 'primary.light' }}>
        <Typography fontWeight={700} variant="body2">Restaurant workspace</Typography>
        <Typography variant="caption" color="text.secondary">Daily service and restaurant setup.</Typography>
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
            <Typography variant="caption" color="text.secondary">Daily service and master data</Typography>
          </Box>
          <Tooltip title="Notifications"><IconButton><NotificationsNoneRoundedIcon /></IconButton></Tooltip>
          <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />
          <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}>{user?.fullName.charAt(0)}</Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" fontWeight={700}>{user?.fullName}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.role}</Typography>
          </Box>
          <Tooltip title="Log out"><IconButton aria-label="Log out" onClick={() => { logout(); navigate("/login", { replace: true }); }}><LogoutRoundedIcon /></IconButton></Tooltip>
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
