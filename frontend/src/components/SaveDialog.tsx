import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (listName: string) => void;
  defaultListName?: string;
}

const SaveDialog: React.FC<SaveDialogProps> = ({ open, onClose, onSave, defaultListName = 'My Leads' }) => {
  const [listName, setListName] = useState(defaultListName);

  const handleSave = () => {
    onSave(listName);
    setListName(defaultListName);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Save Leads</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter a name for your list of leads
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="List Name"
          fullWidth
          value={listName}
          onChange={(e) => setListName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary" disabled={!listName.trim()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveDialog;
