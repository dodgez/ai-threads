import type {
  Message as BedrockMessage,
  ConverseStreamOutput,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationRole } from '@aws-sdk/client-bedrock-runtime';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import useTheme from '@mui/material/styles/useTheme';
import TextField from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { IpcRendererEvent } from 'electron';
import { useCallback, useEffect, useRef, useState } from 'react';

import Message from './Message';
import Suggestion from './Suggestion';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const electron = require('electron');

export default function Thread() {
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<(BedrockMessage & { id: string })[]>(
    [],
  );
  const latestMessage = useRef<BedrockMessage & { id: string }>();

  useEffect(() => {
    const callback = (_: IpcRendererEvent, data: ConverseStreamOutput) => {
      if (data.messageStart) {
        latestMessage.current = {
          role: data.messageStart.role,
          content: [{ text: '' }],
          id: Date.now().toString(),
        };
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        setMessages((messages) => [...messages, latestMessage.current!]);
      } else if (data.contentBlockDelta) {
        if (
          latestMessage.current?.content &&
          data.contentBlockDelta.contentBlockIndex !== undefined
        ) {
          const contentBlock =
            latestMessage.current.content[
              data.contentBlockDelta.contentBlockIndex
            ];
          if (
            contentBlock.text !== undefined &&
            data.contentBlockDelta.delta?.text !== undefined
          ) {
            contentBlock.text += data.contentBlockDelta.delta.text;
            setMessages((messages) => [
              ...messages.slice(0, messages.length - 1),
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              latestMessage.current!,
            ]);
          }
        }
      } else if (data.messageStop) {
        setLoading(false);
      }
    };
    electron.ipcRenderer.on('responseEvent', callback);

    return () => {
      electron.ipcRenderer.removeListener('responseEvent', callback);
    };
  }, []);

  const [loading, setLoading] = useState(false);
  const send = useCallback(async () => {
    setLoading(true);
    setMessages((messages) => [
      ...messages,
      {
        role: ConversationRole.USER,
        content: [{ text: newMessage }],
        id: Date.now().toString(),
      },
    ]);
    setNewMessage('');
    await electron.ipcRenderer.invoke('chat', [
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      {
        role: ConversationRole.USER,
        content: [{ text: newMessage }],
      },
    ]);
  }, [messages, newMessage]);

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
      {messages.length > 0 ? (
        <Container maxWidth="md" sx={{ flexGrow: 1, p: 2 }}>
          <Stack spacing={2}>
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </Stack>
        </Container>
      ) : (
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
      )}
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
          disabled={loading}
          fullWidth
          multiline
          onChange={({ target }) => {
            setNewMessage(target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (newMessage.trim()) {
                void send();
              }
            }
          }}
          placeholder="Ask a question"
          value={newMessage}
        />
        {loading ? (
          <CircularProgress sx={{ padding: 1 }} />
        ) : (
          <IconButton disabled={!newMessage.trim()} onClick={() => void send()}>
            <ArrowUpwardRounded />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}
