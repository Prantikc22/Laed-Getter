import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface MenuItem {
  text: string;
  icon: JSX.Element;
  path: string;
}

const menuItems: MenuItem[] = [
  { text: 'Search', icon: <SearchIcon />, path: '/' },
  { text: 'Domain Search', icon: <SearchIcon />, path: '/domain-search' },
  { text: 'Saved Lists', icon: <SaveIcon />, path: '/saved-lists' },
];

const DRAWER_WIDTH = 280;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isCurrentPath = (path: string) => location.pathname === path;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          borderRight: 0,
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            color: 'common.white',
            fontWeight: 600,
            mb: 4,
            textAlign: 'center',
          }}
        >
          Lead Getter
        </Typography>
        
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => navigate(item.path)}
                selected={isCurrentPath(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  color: 'common.white',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'common.white' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    sx: { color: 'common.white' }
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
