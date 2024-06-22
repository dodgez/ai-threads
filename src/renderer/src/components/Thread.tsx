import type { ConverseStreamOutput } from '@aws-sdk/client-bedrock-runtime';
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
import type { MessageType } from '../ThreadProvider';
import { useThreads } from '../ThreadProvider';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const electron = require('electron');

export default function Thread() {
  const { threads, setThreads, activeThread } = useThreads();
  const thread = threads.find((thread) => thread.id === activeThread);
  const [newMessage, setNewMessage] = useState('');
  const latestMessage = useRef<MessageType>();

  // Used for scrolling messages into view
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const callback = (_: IpcRendererEvent, data: ConverseStreamOutput) => {
      if (data.messageStart) {
        latestMessage.current = {
          role: data.messageStart.role,
          content: [{ text: '' }],
          id: Date.now().toString(),
        };
        setThreads((threads) => {
          const thread = threads.find((thread) => thread.id === activeThread);
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          thread?.messages.push(latestMessage.current!);
          return [...threads];
        });
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
            setThreads((threads) => {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const thread = threads.find(
                (thread) => thread.id === activeThread,
              )!;
              thread.messages = [
                ...thread.messages.slice(0, thread.messages.length - 1),
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                latestMessage.current!,
              ];
              return [...threads];
            });
            bottomRef.current?.scrollIntoView({
              behavior: 'instant',
            });
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
  }, [activeThread, setThreads]);

  const [loading, setLoading] = useState(false);
  const send = useCallback(async () => {
    if (!thread) {
      return;
    }
    setLoading(true);
    thread.messages.push({
      role: ConversationRole.USER,
      content: [{ text: newMessage }],
      id: Date.now().toString(),
    });
    setNewMessage('');
    const response = await electron.ipcRenderer.invoke('chat', [
      ...thread.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ]);
    if ((response as { httpStatusCode: number }).httpStatusCode !== 200) {
      setLoading(false);
      thread.messages.pop();
      alert('An unexpected error occurred.');
    }
  }, [thread, newMessage]);

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
      {thread?.messages && thread.messages.length > 0 ? (
        <Container maxWidth="lg" sx={{ flexGrow: 1, p: 2 }}>
          <Stack spacing={2}>
            {thread.messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            <Box mt="0px !important" ref={bottomRef} />
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
