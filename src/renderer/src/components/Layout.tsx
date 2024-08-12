import Settings from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { SnackbarProvider } from 'notistack';
import numeral from 'numeral';
import { useCallback, useEffect, useState } from 'react';

import LandingPage from './LandingPage';
import Thread from './Thread';
import ThreadButton from './ThreadButton';
import type { ThreadType } from '../types';
import { useThreadStore } from '../useThreadStore';

export default function Layout() {
  const hasHydrated = useThreadStore((state) => state._hasHydrated);
  const awsCredProfile = useThreadStore((state) => state.awsCredProfile);
  const setAwsCredProfile = useThreadStore((state) => state.setAwsCredProfile);
  const threads = useThreadStore((state) => state.threads);
  const [activeThreadId, setActiveThreadId] = useState<ThreadType['id']>();
  const activeThread = activeThreadId ? threads[activeThreadId] : undefined;
  const tokens = useThreadStore((state) => state.tokens);
  const playbackSpeed = useThreadStore((state) => state.playbackSpeed);
  const setPlaybackSpeed = useThreadStore((state) => state.setPlaybackSpeed);
  const [tempPlaybackSpeed, setTempPlaybackSpeed] = useState(playbackSpeed);
  useEffect(() => {
    setTempPlaybackSpeed(playbackSpeed);
  }, [playbackSpeed]);

  // Pass to the thread to trigger call during screen transition
  const [lastCreatedThreadId, setLastCreatedThreadId] =
    useState<ThreadType['id']>();

  const onCreate = useCallback((threadId: ThreadType['id']) => {
    setLastCreatedThreadId(threadId);
    setActiveThreadId(threadId);
  }, []);

  const [modalOpen, setModalOpen] = useState(false);

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
        <Box display="flex" ml={2} mr={2} mt={2}>
          <Button
            disabled={!activeThread}
            onClick={() => {
              setActiveThreadId(undefined);
            }}
            sx={{ flexGrow: 1 }}
            variant="outlined"
          >
            New thread
          </Button>
          <IconButton
            onClick={() => {
              setModalOpen(true);
            }}
          >
            <Settings />
          </IconButton>
        </Box>
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
      <Modal open={modalOpen}>
        <Box
          border="2px solid #000"
          boxShadow={24}
          left="50%"
          pb={2}
          pt={4}
          px={4}
          position="absolute"
          top="50%"
          sx={{
            backgroundColor: (theme) => theme.palette.background.paper,
            transform: 'translate(-50%, -50%)',
          }}
          width="400px"
        >
          <Stack spacing={2}>
            <Box alignItems="center" display="flex" flexDirection="row">
              <Typography sx={{ textWrap: 'nowrap', pr: 2 }}>
                Playback speed
              </Typography>
              <Slider
                marks
                max={4}
                min={0.25}
                onChange={(_, value) => {
                  setTempPlaybackSpeed(value as number);
                }}
                onChangeCommitted={(_, value) => {
                  setPlaybackSpeed(value as number);
                }}
                step={0.25}
                sx={{ pt: 4 }}
                value={tempPlaybackSpeed}
                valueLabelDisplay="on"
              />
            </Box>
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
            <Button
              onClick={() => {
                setModalOpen(false);
              }}
            >
              Close
            </Button>
          </Stack>
        </Box>
      </Modal>
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
