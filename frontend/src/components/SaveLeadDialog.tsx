import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';

interface SavedList {
  id: string;
  name: string;
}

export interface BusinessResult {
  business_name: string;
  address: string;
  phone?: string;
  website?: string;
  google_maps_url?: string;
  distance?: number;
}

export interface SaveLeadDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (listName: string, listId?: string) => Promise<void>;
  existingLists: SavedList[];
  business: BusinessResult | null;
}

const SaveLeadDialog: React.FC<SaveLeadDialogProps> = ({
  open,
  onClose,
  onSave,
  existingLists,
  business,
}) => {
  const [selectedList, setSelectedList] = useState<string>('');
  const [newListName, setNewListName] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  const handleSave = async () => {
    if (isCreatingNew) {
      await onSave(newListName);
    } else {
      await onSave(selectedList, selectedList);
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedList('');
    setNewListName('');
    setIsCreatingNew(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save Lead</DialogTitle>
      <DialogContent>
        {business && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {business.business_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {business.address}
            </Typography>
          </Box>
        )}
        
        {!isCreatingNew ? (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select List</InputLabel>
              <Select
                value={selectedList}
                onChange={(e) => setSelectedList(e.target.value)}
                label="Select List"
              >
                {existingLists.map((list) => (
                  <MenuItem key={list.id} value={list.id}>
                    {list.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              onClick={() => setIsCreatingNew(true)}
              sx={{ textTransform: 'none' }}
            >
              Or create a new list
            </Button>
          </>
        ) : (
          <>
            <TextField
              autoFocus
              margin="dense"
              label="New List Name"
              fullWidth
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              onClick={() => setIsCreatingNew(false)}
              sx={{ textTransform: 'none' }}
            >
              Or select an existing list
            </Button>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isCreatingNew ? !newListName : !selectedList}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveLeadDialog;
