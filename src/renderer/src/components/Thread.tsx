import type {
  ContentBlock,
  ConverseStreamOutput,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationRole } from '@aws-sdk/client-bedrock-runtime';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { IpcRendererEvent } from 'electron';
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

import Message from './Message';
import type { MessageType, ThreadType } from '../useThreadStore';
import { useThreadStore } from '../useThreadStore';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const electron = require('electron');

export default function Thread({
  created,
  thread,
}: {
  created: boolean;
  thread: ThreadType;
}) {
  const addMessage = useThreadStore((state) => state.addMessage);
  const [newMessage, setNewMessage] = useState('');
  const [streamingResponse, setStreamingResponse] =
    useState<MessageType['content']>();

  // Used for scrolling messages into view
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const callback = (_: IpcRendererEvent, data: ConverseStreamOutput) => {
      if (data.messageStart) {
        setStreamingResponse([{ text: '' }]);
      } else if (data.contentBlockDelta) {
        if (data.contentBlockDelta.contentBlockIndex !== undefined) {
          if (data.contentBlockDelta.delta?.text !== undefined) {
            const index = data.contentBlockDelta.contentBlockIndex;
            const text = data.contentBlockDelta.delta.text.toString();
            setStreamingResponse((res) => {
              if (!res) return res;

              const response = [
                ...res.map((cb) => ({ text: cb.text }) as ContentBlock),
              ];
              if (response[index].text === undefined) {
                response[index].text = text;
              } else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                response[index].text! += text;
              }

              return response;
            });
            bottomRef.current?.scrollIntoView({
              behavior: 'instant',
            });
          }
        }
      } else if (data.messageStop) {
        setLoading(false);
        // TODO: hack add message by piggy-backing on state change
        setStreamingResponse((res) => {
          addMessage(thread.id, {
            role: ConversationRole.ASSISTANT,
            content: res,
            id: uuid(),
          });
          return undefined;
        });
      }
    };
    electron.ipcRenderer.on('responseEvent', callback);

    return () => {
      electron.ipcRenderer.removeListener('responseEvent', callback);
    };
  }, [addMessage, thread.id]);

  const [loading, setLoading] = useState(created);
  const send = useCallback(async () => {
    setLoading(true);
    const newMessageType = {
      role: ConversationRole.USER,
      content: [{ text: newMessage }],
      id: uuid(),
    };
    addMessage(thread.id, newMessageType);
    setNewMessage('');
    const response = void (await electron.ipcRenderer.invoke(
      'chat',
      thread.messages
        .map((message) => ({
          role: message.role,
          content: message.content,
        }))
        .concat(newMessageType),
    ));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if ((response! as { httpStatusCode: number }).httpStatusCode !== 200) {
      setLoading(false);
      thread.messages.pop();
      alert(JSON.stringify(response));
    }
  }, [addMessage, thread, newMessage]);

  // Execute call when thread first created
  const needsTrigger = useRef(created);
  if (needsTrigger.current) {
    needsTrigger.current = false;
    void electron.ipcRenderer
      .invoke(
        'chat',
        thread.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      )
      .then((response) => {
        if ((response as { httpStatusCode: number }).httpStatusCode !== 200) {
          setLoading(false);
          alert(JSON.stringify(response));
        }
      });
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      flexGrow={1}
      height="100%"
      mx="auto"
    >
      <Container maxWidth="lg" sx={{ flexGrow: 1, p: 2 }}>
        <Stack spacing={2}>
          {thread.messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
          {streamingResponse && (
            <Message
              message={{
                role: ConversationRole.ASSISTANT,
                content: streamingResponse,
              }}
            />
          )}
          <Box mt="0px !important" ref={bottomRef} />
        </Stack>
      </Container>
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
