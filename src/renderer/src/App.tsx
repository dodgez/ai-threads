import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
import createTheme from '@mui/material/styles/createTheme';
import ThemeProvider from '@mui/material/styles/ThemeProvider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useMemo } from 'react';

import Thread from './components/Thread';

export default function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
        },
      }),
    [prefersDarkMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box display="flex" height="100vh">
        <Drawer
          anchor="left"
          sx={{
            flexShrink: 0,
            width: 200,
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              padding: 3,
              width: 200,
            },
          }}
          variant="permanent"
        >
          <Button disabled variant="outlined">
            New thread
          </Button>
        </Drawer>
        <Thread />
      </Box>
    </ThemeProvider>
  );
}
