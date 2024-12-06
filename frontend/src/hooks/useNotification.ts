import { useCallback } from 'react';
import { useSnackbar } from 'notistack';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

export const useNotification = () => {
  const { enqueueSnackbar } = useSnackbar();

  const showNotification = useCallback((message: string, type: NotificationType) => {
    enqueueSnackbar(message, {
      variant: type,
      anchorOrigin: {
        vertical: 'top',
        horizontal: 'right',
      },
      autoHideDuration: 3000,
    });
  }, [enqueueSnackbar]);

  return { showNotification };
};
