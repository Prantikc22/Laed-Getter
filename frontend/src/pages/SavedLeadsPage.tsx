import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Language as LanguageIcon,
  Phone as PhoneIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';

interface SavedBusiness {
  id: number;
  business_name: string;
  address: string;
  phone: string;
  website: string;
  distance: number;
  status: string;
  google_maps_url: string;
  scraped_emails: string[];
  created_at: string;
}

const SavedLeadsPage: React.FC = () => {
  const [lists, setLists] = useState<string[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<SavedBusiness[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<SavedBusiness | null>(null);

  const { showNotification } = useNotification();

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const response = await fetch('/api/saved-lists');
      const data = await response.json();
      setLists(data);
    } catch (error) {
      console.error('Error fetching lists:', error);
      showNotification('Failed to fetch saved lists', 'error');
    }
  };

  const fetchBusinesses = async (listName: string) => {
    try {
      const response = await fetch(`/api/get-list-businesses/${encodeURIComponent(listName)}`);
      const data = await response.json();
      setBusinesses(data);
      setSelectedList(listName);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      showNotification('Failed to fetch businesses', 'error');
    }
  };

  const handleViewBusiness = (business: SavedBusiness) => {
    setSelectedBusiness(business);
    setViewDialogOpen(true);
  };

  const handleDeleteBusiness = async (businessId: number) => {
    try {
      const response = await fetch(`/api/delete-business/${businessId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setBusinesses(businesses.filter(b => b.id !== businessId));
        showNotification('Business deleted successfully', 'success');
      } else {
        showNotification('Failed to delete business', 'error');
      }
    } catch (error) {
      console.error('Error deleting business:', error);
      showNotification('Error deleting business', 'error');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          Saved Leads
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Lists
                </Typography>
                <List>
                  {lists.map((list) => (
                    <ListItemButton
                      key={list}
                      selected={selectedList === list}
                      onClick={() => fetchBusinesses(list)}
                    >
                      <ListItemText primary={list} />
                    </ListItemButton>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={9}>
            {selectedList && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Businesses in {selectedList}
                </Typography>
                <Grid container spacing={2}>
                  {businesses.map((business) => (
                    <Grid item xs={12} key={business.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography variant="h6">
                                {business.business_name}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                📍 {business.address}
                              </Typography>
                              {business.phone && (
                                <Typography variant="body2">
                                  📞 {business.phone}
                                </Typography>
                              )}
                              {business.scraped_emails && business.scraped_emails.length > 0 && (
                                <Typography variant="body2">
                                  ✉️ {business.scraped_emails.join(', ')}
                                </Typography>
                              )}
                            </Box>
                            <Box>
                              <IconButton onClick={() => handleViewBusiness(business)}>
                                <VisibilityIcon />
                              </IconButton>
                              <IconButton onClick={() => handleDeleteBusiness(business.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Grid>
        </Grid>

        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Business Details</DialogTitle>
          <DialogContent>
            {selectedBusiness && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom>
                  {selectedBusiness.business_name}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Address:</strong> {selectedBusiness.address}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Phone:</strong> {selectedBusiness.phone}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Website:</strong> {selectedBusiness.website}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Distance:</strong> {selectedBusiness.distance} km
                </Typography>
                {selectedBusiness.scraped_emails && selectedBusiness.scraped_emails.length > 0 && (
                  <Typography variant="body1" paragraph>
                    <strong>Emails:</strong> {selectedBusiness.scraped_emails.join(', ')}
                  </Typography>
                )}
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  {selectedBusiness.google_maps_url && (
                    <Button
                      variant="contained"
                      startIcon={<MapIcon />}
                      onClick={() => window.open(selectedBusiness.google_maps_url, '_blank')}
                    >
                      Open in Maps
                    </Button>
                  )}
                  {selectedBusiness.phone && (
                    <Button
                      variant="contained"
                      startIcon={<PhoneIcon />}
                      onClick={() => window.open(`tel:${selectedBusiness.phone}`, '_blank')}
                    >
                      Call
                    </Button>
                  )}
                  {selectedBusiness.website && (
                    <Button
                      variant="contained"
                      startIcon={<LanguageIcon />}
                      onClick={() => window.open(selectedBusiness.website, '_blank')}
                    >
                      Visit Website
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default SavedLeadsPage;
