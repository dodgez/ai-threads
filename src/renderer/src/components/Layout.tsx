import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';

import Thread from './Thread';
import ThreadButton from './ThreadButton';
import { useThreads } from '../ThreadProvider';

export default function Layout() {
  const { threads, setThreads, setActiveThread } = useThreads();

  return (
    <Box display="flex" height="100vh">
      <Drawer
        anchor="left"
        sx={{
          flexShrink: 0,
          width: 300,
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            padding: 3,
            width: 300,
          },
        }}
        variant="permanent"
      >
        <Stack spacing={2}>
          <Button
            onClick={() => {
              const now = Date.now().toString();
              setThreads([
                ...threads,
                { id: now, messages: [], name: 'New chat' },
              ]);
              setActiveThread(now);
            }}
            variant="outlined"
          >
            New thread
          </Button>
          {threads.map((thread) => (
            <ThreadButton key={thread.id} thread={thread} />
          ))}
        </Stack>
      </Drawer>
      <Thread />
    </Box>
  );
}
