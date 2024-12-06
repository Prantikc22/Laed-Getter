import React from 'react';
import { Button, CircularProgress, ButtonProps } from '@mui/material';

interface CustomLoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingPosition?: 'start' | 'center' | 'end';
  startIcon?: React.ReactNode;
}

const CustomLoadingButton: React.FC<CustomLoadingButtonProps> = ({
  children,
  loading = false,
  loadingPosition = 'center',
  startIcon,
  disabled,
  ...props
}) => {
  const loadingIndicator = (
    <CircularProgress
      color="inherit"
      size={20}
      sx={{
        position: 'absolute',
        left: loadingPosition === 'start' ? 14 : 'auto',
        right: loadingPosition === 'end' ? 14 : 'auto',
      }}
    />
  );

  return (
    <Button
      {...props}
      disabled={loading || disabled}
      startIcon={!loading && startIcon}
      sx={{
        position: 'relative',
        ...props.sx,
      }}
    >
      {loading && loadingIndicator}
      {children}
    </Button>
  );
};

export default CustomLoadingButton;
