import React, { useState } from 'react';
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Save as SaveIcon,
  SaveAlt as SaveAltIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface BusinessLead {
  name: string;
  website: string;
  address: string;
  phone: string;
  category: string;
  found_at: string;
}

const BusinessSearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BusinessLead[]>([]);
  const [error, setError] = useState<string>('');
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:3001/api/business-search', {
        query: query.trim(),
        location: location.trim()
      });

      setResults(response.data.results);
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      const timestamp = new Date().toISOString();
      const response = await axios.post('http://localhost:3001/api/save-leads', {
        leads: results,
        category: 'business',
        name: `business_search_${timestamp}`,
        searchTerm: query,
        locations: [location]
      });
      
      if (response.data.message) {
        setSnackbarMessage('All leads saved successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error saving leads:', error);
      setSnackbarMessage('Failed to save leads. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSaveLead = async (lead: BusinessLead) => {
    try {
      const timestamp = new Date().toISOString();
      const response = await axios.post('http://localhost:3001/api/save-leads', {
        leads: [lead],
        category: 'business',
        name: `business_${lead.name}_${timestamp}`,
        searchTerm: query,
        locations: [location]
      });
      
      if (response.data.message) {
        setSnackbarMessage('Lead saved successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      setSnackbarMessage('Failed to save lead. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Business Search
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            label="Search Query"
            variant="outlined"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter business type, name, or keywords"
          />
          <TextField
            fullWidth
            label="Location"
            variant="outlined"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, State, or ZIP"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearch}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
          >
            Search
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {results.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Found {results.length} business{results.length === 1 ? '' : 'es'}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveAltIcon />}
                onClick={handleSaveAll}
              >
                Save All Leads
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Business Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((lead, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body1">{lead.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {lead.website}
                        </Typography>
                      </TableCell>
                      <TableCell>{lead.category}</TableCell>
                      <TableCell>{lead.address}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{lead.phone}</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Save Lead">
                          <IconButton
                            color="primary"
                            onClick={() => handleSaveLead(lead)}
                          >
                            <SaveIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BusinessSearchPage;
