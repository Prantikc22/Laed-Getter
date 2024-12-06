import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { NotificationProvider } from './context/NotificationContext';
import Navigation from './components/Navigation';
import SearchPage from './pages/SearchPage';
import SavedListsPage from './pages/SavedListsPage';
import DomainSearchPage from './pages/DomainSearchPage';

const DRAWER_WIDTH = 280;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveBusiness = async (business: any) => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/save-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(business),
      });

      if (!response.ok) {
        throw new Error('Failed to save business');
      }

      const data = await response.json();
      console.log('Business saved:', data);
    } catch (error) {
      console.error('Error saving business:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <SnackbarProvider maxSnack={3}>
          <Router>
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
              <Navigation />
              <Box
                component="main"
                sx={{
                  flexGrow: 1,
                  bgcolor: 'background.default',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <Routes>
                  <Route path="/" element={<SearchPage />} />
                  <Route path="/domain-search" element={<DomainSearchPage />} />
                  <Route path="/saved-lists" element={<SavedListsPage />} />
                </Routes>
              </Box>
            </Box>
          </Router>
        </SnackbarProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
