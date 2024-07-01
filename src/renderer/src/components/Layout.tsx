import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useCallback, useState } from 'react';

import LandingPage from './LandingPage';
import Thread from './Thread';
import ThreadButton from './ThreadButton';
import type { ThreadType } from '../useThreadStore';
import { useThreadStore } from '../useThreadStore';

export default function Layout() {
  const hasHydrated = useThreadStore((state) => state._hasHydrated);
  const awsCredProfile = useThreadStore((state) => state.awsCredProfile);
  const setAwsCredProfile = useThreadStore((state) => state.setAwsCredProfile);
  const threads = useThreadStore((state) => state.threads);
  const [activeThreadId, setActiveThreadId] = useState<ThreadType['id']>();
  const activeThread = activeThreadId ? threads[activeThreadId] : undefined;

  // Pass to the thread to trigger call during screen transition
  const [lastCreatedThreadId, setLastCreatedThreadId] =
    useState<ThreadType['id']>();

  const onCreate = useCallback((threadId: ThreadType['id']) => {
    setLastCreatedThreadId(threadId);
    setActiveThreadId(threadId);
  }, []);

  if (!hasHydrated) {
    return (
      <Box
        alignItems="center"
        display="flex"
        height="100vh"
        justifyContent="center"
      >
        <CircularProgress />
      </Box>
    );
  }

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
        <Stack spacing={2} sx={{ flexGrow: 1 }}>
          <Button
            disabled={!activeThread}
            onClick={() => {
              setActiveThreadId(undefined);
            }}
            variant="outlined"
          >
            New thread
          </Button>
          {Object.entries(threads).map(([_, thread]) => {
            if (!thread) {
              return null;
            }
            return (
              <ThreadButton
                activeThread={activeThread}
                key={thread.id}
                onClick={() => {
                  setActiveThreadId(thread.id);
                }}
                thread={thread}
              />
            );
          })}
        </Stack>
        <TextField
          onChange={({ target }) => {
            if (target.value === '') {
              setAwsCredProfile(undefined);
            } else {
              setAwsCredProfile(target.value);
            }
          }}
          placeholder="AWS credentials profile"
          value={awsCredProfile ?? ''}
        />
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
