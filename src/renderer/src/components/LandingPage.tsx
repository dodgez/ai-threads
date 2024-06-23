import { ConversationRole } from '@aws-sdk/client-bedrock-runtime';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import useTheme from '@mui/material/styles/useTheme';
import TextField from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useCallback, useState } from 'react';
import { v4 as uuid } from 'uuid';

import Suggestion from './Suggestion';
import type { ThreadType } from '../useThreadStore';
import { useThreadStore } from '../useThreadStore';

export default function LandingPage({
  onCreate,
}: {
  onCreate: (id: ThreadType['id']) => void;
}) {
  const createThread = useThreadStore((state) => state.createThread);
  const [newMessage, setNewMessage] = useState('');

  const send = useCallback(() => {
    const newId = createThread({
      role: ConversationRole.USER,
      content: [{ text: newMessage }],
      id: uuid(),
    });
    onCreate(newId);
  }, [createThread, newMessage, onCreate]);

  const theme = useTheme();
  const mdMediaQuery = useMediaQuery(theme.breakpoints.up('md'));
  const lgMediaQuery = useMediaQuery(theme.breakpoints.up('lg'));

  return (
    <Box
      display="flex"
      flexDirection="column"
      flexGrow={1}
      height="100%"
      mx="auto"
    >
      <Box alignContent="center" flexGrow={1}>
        <Box display="flex" flexDirection="row" justifyContent="space-around">
          <Suggestion
            header="Programming"
            suggestion="Implement FizzBuzz in JavaScript."
          />
          {mdMediaQuery && (
            <Suggestion
              header="Science"
              suggestion="How many planets are in the Solar System?"
            />
          )}
          {lgMediaQuery && (
            <Suggestion
              header="Literature"
              suggestion="Write a Haiku about Rabbits."
            />
          )}
        </Box>
      </Box>
      <Box
        alignItems="end"
        bottom={0}
        display="flex"
        pb={2}
        position="sticky"
        px={2}
        sx={{ backgroundColor: (theme) => theme.palette.background.default }}
      >
        <TextField
          fullWidth
          multiline
          onChange={({ target }) => {
            setNewMessage(target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (newMessage.trim()) {
                send();
              }
            }
          }}
          placeholder="Ask a question"
          value={newMessage}
        />
        <IconButton
          disabled={!newMessage.trim()}
          onClick={() => {
            send();
          }}
        >
          <ArrowUpwardRounded />
        </IconButton>
      </Box>
    </Box>
  );
}
