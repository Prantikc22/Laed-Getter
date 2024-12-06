import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
  Tooltip,
  CircularProgress,
  Container,
  Paper,
  Button,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Download as DownloadOutlined,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Language as LanguageIcon,
  Phone as PhoneIcon,
  GetApp as GetAppIcon,
  Close as CloseIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';

interface SavedLead {
  id: number;
  business_name: string;
  website?: string;
  address: string;
  phone?: string;
  status?: string;
  google_maps_url?: string;
}

interface SavedList {
  id: string;
  name: string;
  count: number;
  created_at: string;
  description?: string;
  leads?: SavedLead[];
}

const SavedListsPage: React.FC = () => {
  const [lists, setLists] = useState<SavedList[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<SavedList | null>(null);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lists');
      if (!response.ok) {
        throw new Error('Failed to fetch lists');
      }
      const data = await response.json();
      setLists(data.lists || []);
    } catch (error) {
      console.error('Error fetching lists:', error);
      showNotification('Error fetching saved lists', 'error');
      setLists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (listId: string) => {
    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setLists(lists.filter(list => list.id !== listId));
        showNotification('List deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      showNotification('Error deleting list', 'error');
    }
  };

  const handleDownload = async (list: SavedList) => {
    try {
      const response = await fetch(`/api/lists/${list.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${list.name}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading list:', error);
      showNotification('Error downloading list', 'error');
    }
  };

  const handleViewList = (list: SavedList) => {
    setSelectedList(list);
    setViewDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedList) {
      handleDelete(selectedList.id);
    }
    setDeleteDialogOpen(false);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
  };

  const handleDeleteClick = (list: SavedList) => {
    setSelectedList(list);
    setDeleteDialogOpen(true);
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ maxWidth: '100%', mx: 'auto' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Saved Lists
          <Typography variant="subtitle1" sx={{ mt: 1, color: 'text.secondary' }}>
            Manage your saved business leads
          </Typography>
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : lists.length === 0 ? (
          <Paper sx={{ p: 4, mt: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Saved Lists Yet
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Start by saving leads from your search results to create lists.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {lists.map((list) => (
              <Grid item xs={12} sm={6} md={4} key={list.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="div">
                        {list.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(list.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {list.leads?.length || 0} {list.leads?.length === 1 ? 'Lead' : 'Leads'}
                      </Typography>
                      {list.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {list.description}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewList(list)}
                      sx={{ mr: 1 }}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      startIcon={<GetAppIcon />}
                      onClick={() => handleDownload(list)}
                      sx={{ mr: 1 }}
                    >
                      Download
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteClick(list)}
                    >
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Dialog
          open={viewDialogOpen}
          onClose={handleCloseViewDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {selectedList?.name}
            <IconButton
              aria-label="close"
              onClick={handleCloseViewDialog}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {selectedList?.leads && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Business Name</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedList.leads.map((lead, index) => (
                      <TableRow key={index}>
                        <TableCell>{lead.business_name}</TableCell>
                        <TableCell>{lead.address}</TableCell>
                        <TableCell>
                          {lead.phone && (
                            <Tooltip title={lead.phone}>
                              <IconButton size="small">
                                <PhoneIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {lead.website && (
                            <Tooltip title="Visit Website">
                              <IconButton 
                                size="small"
                                href={lead.website}
                                target="_blank"
                              >
                                <LanguageIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.google_maps_url && (
                            <Tooltip title="View on Google Maps">
                              <IconButton
                                size="small"
                                href={lead.google_maps_url}
                                target="_blank"
                              >
                                <MapIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseViewDialog}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete List</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete "{selectedList?.name}"? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleConfirmDelete} 
              color="error" 
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default SavedListsPage;
