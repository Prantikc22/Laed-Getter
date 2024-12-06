import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer as MuiDrawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const DRAWER_WIDTH = 280;

const StyledDrawer = styled(MuiDrawer)(({ theme }) => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    background: 'linear-gradient(180deg, #17212F 0%, #19212F 100%)',
    color: theme.palette.common.white,
    borderRight: 'none',
    height: '100vh',
    position: 'fixed',
  },
}));

const ListItemStyled = styled(ListItemButton)<{ selected?: boolean }>(({ theme, selected }) => ({
  margin: '4px 8px',
  borderRadius: '8px',
  transition: 'all 0.3s ease',
  background: selected ? 'linear-gradient(90deg, #182A4E 0%, #141F32 100%)' : 'transparent',
  position: 'relative',
  '&:before': selected ? {
    content: '""',
    position: 'absolute',
    left: '-8px',
    top: 0,
    bottom: 0,
    width: '4px',
    backgroundColor: theme.palette.common.white,
    borderRadius: '0 4px 4px 0',
  } : {},
  '&:hover': {
    background: selected ? 'linear-gradient(90deg, #182A4E 0%, #141F32 100%)' : 'rgba(255, 255, 255, 0.08)',
  }
}));

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isCurrentPath = (path: string) => location.pathname === path;

  return (
    <StyledDrawer variant="permanent">
      <Box sx={{ p: 2 }}>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            fontWeight: 'bold', 
            color: 'white',
          }}
        >
          Lead Getter
        </Typography>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            color: 'rgba(255,255,255,0.7)',
            mb: 1,
          }}
        >
          Discover Your Next Business Connection
        </Typography>
        <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </Box>

      <List>
        <ListItem disablePadding>
          <ListItemStyled
            onClick={() => navigate('/')}
            selected={isCurrentPath('/')}
          >
            <ListItemIcon>
              <SearchIcon sx={{ color: 'common.white' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Search" 
              primaryTypographyProps={{
                sx: { color: 'common.white' }
              }}
            />
          </ListItemStyled>
        </ListItem>

        <ListItem disablePadding>
          <ListItemStyled
            onClick={() => navigate('/saved-lists')}
            selected={isCurrentPath('/saved-lists')}
          >
            <ListItemIcon>
              <SaveIcon sx={{ color: 'common.white' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Saved Lists" 
              primaryTypographyProps={{
                sx: { color: 'common.white' }
              }}
            />
          </ListItemStyled>
        </ListItem>
      </List>
    </StyledDrawer>
  );
};

export default Navigation;
