import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { SnackbarProvider } from 'notistack';
import numeral from 'numeral';
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
  const tokens = useThreadStore((state) => state.tokens);

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
            width: 300,
          },
        }}
        variant="permanent"
      >
        <Button
          disabled={!activeThread}
          onClick={() => {
            setActiveThreadId(undefined);
          }}
          sx={{ ml: 2, mr: 2, mt: 2 }}
          variant="outlined"
        >
          New thread
        </Button>
        <Stack sx={{ flexGrow: 1, overflow: 'auto' }}>
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
          sx={{ ml: 2, mr: 2, mb: 0.5 }}
          value={awsCredProfile ?? ''}
        />
        <Box color="gray" mb={0.5} mx="auto">
          <Typography variant="caption">
            {numeral(tokens.input).format('0.00a')}/
            {numeral(tokens.output).format('0.00a')} tokens (in/out) ~$
            {numeral(
              (tokens.input / 1000) * 0.003 + (tokens.output / 1000) * 0.015,
            ).format('0.00a')}
          </Typography>
        </Box>
      </Drawer>
      <SnackbarProvider />
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
