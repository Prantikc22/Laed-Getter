import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Save as SaveIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

interface Business {
  name: string;
  address: string;
  phone: string;
  website?: string;
  category?: string;
}

interface SavedList {
  id: string;
  name: string;
  description: string;
  data: Business[];
  created_at: string;
  updated_at: string;
}

const SavedLists: React.FC = () => {
  const [lists, setLists] = useState<SavedList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

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
    }
    setIsLoading(false);
  };

  const handleCreateList = async () => {
    try {
      const response = await fetch('/api/saved-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newListName,
          description: newListDescription,
          data: [],
        }),
      });
      const data = await response.json();
      setLists([...lists, data]);
      setOpenDialog(false);
      setNewListName('');
      setNewListDescription('');
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await fetch(`/api/saved-lists/${listId}`, {
        method: 'DELETE',
      });
      setLists(lists.filter(list => list.id !== listId));
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Saved Lists</Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create New List
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lists.map((list) => (
              <TableRow key={list.id}>
                <TableCell>{list.name}</TableCell>
                <TableCell>{list.description}</TableCell>
                <TableCell>{list.data.length}</TableCell>
                <TableCell>{new Date(list.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Tooltip title="Delete List">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteList(list.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create New List</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="List Name"
            fullWidth
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={newListDescription}
            onChange={(e) => setNewListDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateList} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SavedLists;
