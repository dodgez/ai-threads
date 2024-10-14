import ArrowBackIos from '@mui/icons-material/ArrowBackIos';
import HelpOutline from '@mui/icons-material/HelpOutline';
import Settings from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { SnackbarProvider } from 'notistack';
import numeral from 'numeral';
import { useCallback, useEffect, useMemo, useState } from 'react';

import LandingPage from './LandingPage';
import Thread from './Thread';
import ThreadButton from './ThreadButton';
import type { ModelId, ThreadType } from '../types';
import { ModelMetadata } from '../types';
import { useThreadStore } from '../useThreadStore';

const DRAWER_WIDTH = 300;

export default function Layout() {
  const hasHydrated = useThreadStore((state) => state._hasHydrated);
  const awsCredProfile = useThreadStore((state) => state.awsCredProfile);
  const setAwsCredProfile = useThreadStore((state) => state.setAwsCredProfile);
  const openAIKey = useThreadStore((state) => state.openAIKey);
  const setOpenAIKey = useThreadStore((state) => state.setOpenAIKey);
  const threads = useThreadStore((state) => state.threads);
  const closeDrawer = useThreadStore((state) => state.closeDrawer);
  const setCloseDrawer = useThreadStore((state) => state.setCloseDrawer);
  const [activeThreadId, setActiveThreadId] = useState<ThreadType['id']>();
  const activeThread = activeThreadId ? threads[activeThreadId] : undefined;
  const tokens = useThreadStore((state) => state.tokens);
  const useAwsCredProfile = useThreadStore((state) => state.useAwsCredProfile);
  const setUseAwsCredProfile = useThreadStore(
    (state) => state.setUseAwsCredProfile,
  );
  const awsCreds = useThreadStore((state) => state.awsCreds);
  const setAwsCreds = useThreadStore((state) => state.setAwsCreds);

  // Pass to the thread to trigger call during screen transition
  const [lastCreatedThreadId, setLastCreatedThreadId] =
    useState<ThreadType['id']>();

  const onCreate = useCallback((threadId: ThreadType['id']) => {
    setLastCreatedThreadId(threadId);
    setActiveThreadId(threadId);
  }, []);

  const [modalOpen, setModalOpen] = useState(false);

  const cost = useMemo(
    () =>
      Object.keys(tokens).reduce((cost, key: string) => {
        const modelId = key as ModelId;
        return (
          cost +
          (ModelMetadata[modelId].pricing.input * tokens[modelId].input) /
            1_000_000 +
          (ModelMetadata[modelId].pricing.output * tokens[modelId].output) /
            1_000_000
        );
      }, 0),
    [tokens],
  );

  const [isChecked, setChecked] = useState(!openAIKey);
  useEffect(() => {
    setChecked(!openAIKey);
  }, [openAIKey]);

  const [drawerOpen, setDrawerOpen] = useState(true);

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
    <Box display="flex" minHeight="100vh">
      <Drawer
        anchor="left"
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerOpen ? DRAWER_WIDTH : 0,
          },
          flexShrink: 0,
          width: drawerOpen ? DRAWER_WIDTH : 0,
        }}
        variant="permanent"
      >
        <Box display="flex" m={1} mr={0}>
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
          {activeThread && (
            <IconButton
              onClick={() => {
                setDrawerOpen(false);
              }}
            >
              <ArrowBackIos />
            </IconButton>
          )}
        </Box>
        <Divider />
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
                  if (closeDrawer) {
                    setDrawerOpen(false);
                  }
                }}
                thread={thread}
              />
            );
          })}
        </Stack>
        <Box color="gray" mb={0.5} mx="auto">
          <Typography variant="caption">
            {`Total cost: ~$${numeral(cost).format('0.00a')}`}
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
          position="absolute"
          pt={4}
          px={4}
          sx={{
            backgroundColor: (theme) => theme.palette.background.paper,
            transform: 'translate(-50%, -50%)',
          }}
          top="50%"
          width="400px"
        >
          <Stack spacing={2}>
            {/* TODO: reimplement when playback speed fixed */}
            {/* <Box alignItems="center" display="flex" flexDirection="row">
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
            </Box> */}
            <Typography textAlign="center" variant="h6">
              AWS configuration
            </Typography>
            <Box display="flex">
              <FormControlLabel
                control={
                  <Switch
                    checked={useAwsCredProfile}
                    onChange={({ target }) => {
                      setUseAwsCredProfile(target.checked);
                    }}
                  />
                }
                label="Use AWS Cred Profile"
                labelPlacement="start"
                sx={{ flexGrow: 1 }}
              />
              <Tooltip
                title={
                  <Typography>
                    Use AWS credential profile or manually input access key id
                    and secret access key.
                  </Typography>
                }
              >
                <IconButton>
                  <HelpOutline />
                </IconButton>
              </Tooltip>
            </Box>
            {useAwsCredProfile ? (
              <TextField
                label="AWS credentials profile"
                onChange={({ target }) => {
                  if (target.value === '') {
                    setAwsCredProfile(undefined);
                  } else {
                    setAwsCredProfile(target.value);
                  }
                }}
                value={awsCredProfile ?? 'default'}
              />
            ) : (
              <>
                <TextField
                  error={!awsCreds?.accessKeyId}
                  helperText={
                    !awsCreds?.accessKeyId && 'Access key id is required'
                  }
                  label="AWS access key id"
                  onChange={({ target }) => {
                    console.log(target.value, awsCreds?.accessKeyId);
                    setAwsCreds({
                      accessKeyId: target.value,
                      secretAccessKey: awsCreds?.secretAccessKey ?? '',
                    });
                  }}
                  value={awsCreds?.accessKeyId ?? ''}
                />
                <TextField
                  error={!awsCreds?.secretAccessKey}
                  helperText={
                    !awsCreds?.secretAccessKey &&
                    'Secret access key is required'
                  }
                  label="AWS secret access key"
                  onChange={({ target }) => {
                    setAwsCreds({
                      accessKeyId: awsCreds?.accessKeyId ?? '',
                      secretAccessKey: target.value,
                    });
                  }}
                  value={awsCreds?.secretAccessKey ?? ''}
                />
              </>
            )}
            <Divider />
            <Typography textAlign="center" variant="h6">
              OpenAI configuration
            </Typography>
            <Box display="flex">
              <FormControlLabel
                control={
                  <Switch
                    checked={isChecked}
                    onChange={({ target }) => {
                      setOpenAIKey(undefined);
                      setChecked(target.checked);
                    }}
                  />
                }
                label="Use AWS Secrets Manager"
                labelPlacement="start"
                sx={{ flexGrow: 1 }}
              />
              <Tooltip
                title={
                  <Typography>
                    Use secret name `ai-threads/api-keys` with `openai`
                    key/value pair.
                  </Typography>
                }
              >
                <IconButton>
                  <HelpOutline />
                </IconButton>
              </Tooltip>
            </Box>
            {!isChecked && (
              <TextField
                label="OpenAI API key"
                onChange={({ target }) => {
                  if (target.value === '') {
                    setOpenAIKey(undefined);
                  } else {
                    setOpenAIKey(target.value);
                  }
                }}
                value={openAIKey}
              />
            )}
            <Divider />
            <Typography textAlign="center" variant="h6">
              Miscellaneous configuration
            </Typography>
            <Box display="flex">
              <FormControlLabel
                control={
                  <Switch
                    checked={closeDrawer}
                    onChange={({ target }) => {
                      setCloseDrawer(target.checked);
                    }}
                  />
                }
                label="Close drawer on thread selection"
                labelPlacement="start"
                sx={{ flexGrow: 1 }}
              />
              <Tooltip
                title={
                  <Typography>
                    Automatically close the left drawer after selecting a
                    conversation thread.
                  </Typography>
                }
              >
                <IconButton>
                  <HelpOutline />
                </IconButton>
              </Tooltip>
            </Box>
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
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
          thread={activeThread}
        />
      ) : (
        <LandingPage onCreate={onCreate} />
      )}
    </Box>
  );
}
