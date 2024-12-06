import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../hooks/useSnackbar';

interface DomainResult {
  title: string;
  description: string;
}

const DomainSearchPage: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [results, setResults] = useState<DomainResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { showSnackbar } = useSnackbar();

  const handleSearch = async () => {
    if (!domain) {
      showSnackbar('Please enter a domain', 'warning');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/domain-search?domain=${encodeURIComponent(domain)}`);
      const data = await response.json();

      if (data.error) {
        showSnackbar(data.error, 'error');
        return;
      }

      setResults(data);
    } catch (error) {
      console.error('Error searching domain:', error);
      showSnackbar('Failed to search domain. Please try again.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Domain Search
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <TextField
          fullWidth
          label="Domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          variant="outlined"
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={isSearching}
          startIcon={isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
        >
          Search
        </Button>
      </Box>

      {results && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {domain}
            </Typography>
            {results.title && (
              <Typography variant="body1" gutterBottom>
                <strong>Title:</strong> {results.title}
              </Typography>
            )}
            {results.description && (
              <Typography variant="body1">
                <strong>Description:</strong> {results.description}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DomainSearchPage;
