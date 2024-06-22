import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useCallback, useState } from 'react';

import Message from './Message';
import Suggestion from './Suggestion';
import type { ChatMessage } from '../types/ChatMessage';
import { ChatMessageType } from '../types/ChatMessage';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const electron = require('electron');

export default function Thread() {
  const [messages, _setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      message: 'What is the meaning of life?',
      type: ChatMessageType.User,
    },
    {
      id: '1',
      message: 'The meaning of life is: 42',
      type: ChatMessageType.Bot,
    },
  ]);

  const send = useCallback(async () => {
    electron.ipcRenderer.on('responseEvent', (_event, data) => {
      console.log(data);
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await electron.ipcRenderer.invoke('chat', 'Hello');
    console.log(response);
  }, []);

  return (
    <Box
      display="flex"
      flexDirection="column"
      flexGrow={1}
      height="100vh"
      mx="auto"
      maxWidth="md"
      p={2}
    >
      {messages.length > 0 ? (
        <Box flexGrow={1}>
          <Stack spacing={2}>
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </Stack>
        </Box>
      ) : (
        <Box alignContent="center" flexGrow={1}>
          <Box display="flex" flexDirection="row" justifyContent="space-around">
            <Suggestion
              header="Science"
              suggestion="How many planets are in the Solar System?"
            />
            <Suggestion
              header="Literature"
              suggestion="Write a Haiku about Rabbits."
            />
            <Suggestion
              header="Programming"
              suggestion="Implement FizzBuzz in JavaScript."
            />
          </Box>
        </Box>
      )}
      <Box alignItems="end" display="flex" flexShrink={0}>
        <TextField fullWidth multiline placeholder="Ask a question" />
        <IconButton onClick={() => void send()}>
          <ArrowUpwardRounded />
        </IconButton>
      </Box>
    </Box>
  );
}
