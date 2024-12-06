import React from 'react';
import {
  IconButton,
  Tooltip,
  Box,
} from '@mui/material';
import {
  Language as LanguageIcon,
  Phone as PhoneIcon,
  Map as MapIcon,
} from '@mui/icons-material';

interface Business {
  business_name: string;
  address: string;
  distance: number;
  phone?: string;
  website?: string;
  google_maps_url?: string;
  status: string;
}

interface ActionButtonsProps {
  business: Business;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  business,
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {business.website && (
        <Tooltip title="Visit Website">
          <IconButton
            onClick={() => window.open(business.website, '_blank')}
            size="small"
            color="primary"
          >
            <LanguageIcon />
          </IconButton>
        </Tooltip>
      )}

      {business.phone && (
        <Tooltip title="Call">
          <IconButton
            onClick={() => window.open(`tel:${business.phone}`, '_blank')}
            size="small"
            color="primary"
          >
            <PhoneIcon />
          </IconButton>
        </Tooltip>
      )}

      {business.google_maps_url && (
        <Tooltip title="View on Google Maps">
          <IconButton
            onClick={() => window.open(business.google_maps_url, '_blank')}
            size="small"
            color="primary"
          >
            <MapIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default ActionButtons;
