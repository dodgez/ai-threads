import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import { useCallback, useState } from 'react';

import LandingPage from './LandingPage';
import Thread from './Thread';
import ThreadButton from './ThreadButton';
import type { ThreadType } from '../useThreadStore';
import { useThreadStore } from '../useThreadStore';

export default function Layout() {
  const threads = useThreadStore((state) => state.threads);
  const [activeThreadId, setActiveThreadId] = useState<ThreadType['id']>();
  const activeThread = activeThreadId ? threads.get(activeThreadId) : undefined;

  // Pass to the thread to trigger call during screen transition
  const [lastCreatedThreadId, setLastCreatedThreadId] =
    useState<ThreadType['id']>();

  const onCreate = useCallback((threadId: ThreadType['id']) => {
    setLastCreatedThreadId(threadId);
    setActiveThreadId(threadId);
  }, []);

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
            disabled={!activeThread}
            onClick={() => {
              setActiveThreadId(undefined);
            }}
            variant="outlined"
          >
            New thread
          </Button>
          {Array.from(threads).map(([_, thread]) => (
            <ThreadButton
              activeThread={activeThread}
              key={thread.id}
              onClick={() => {
                setActiveThreadId(thread.id);
              }}
              thread={thread}
            />
          ))}
        </Stack>
      </Drawer>
      {activeThread ? (
        <Thread
          created={lastCreatedThreadId === activeThreadId}
          thread={activeThread}
        />
      ) : (
        <LandingPage onCreate={onCreate} />
      )}
    </Box>
  );
}
