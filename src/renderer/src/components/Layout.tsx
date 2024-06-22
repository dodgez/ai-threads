import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';

import Thread from './Thread';
import { useThreads } from '../ThreadProvider';

export default function Layout() {
  const { setThreads, setActiveThread } = useThreads();

  return (
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
        <Button
          onClick={() => {
            const now = Date.now().toString();
            setThreads([{ id: now, messages: [] }]);
            setActiveThread(now);
          }}
          variant="outlined"
        >
          New thread
        </Button>
      </Drawer>
      <Thread />
    </Box>
  );
}
