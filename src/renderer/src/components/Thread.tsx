import type {
  Message as BedrockMessage,
  ContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockRuntimeClient,
  ConversationRole,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { AwsCredentialIdentity } from '@smithy/types';
import { useCallback, useRef, useState } from 'react';
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

  const sendMessages = useCallback(
    async (messages: BedrockMessage[]) => {
      const creds = (await electron.ipcRenderer.invoke(
        'creds',
      )) as AwsCredentialIdentity;

      const client = new BedrockRuntimeClient({
        credentials: creds,
        region: 'us-west-2',
      });
      const command = new ConverseStreamCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        messages,
      });

      const stream = (await client.send(command)).stream;

      if (!stream) return;
      for await (const data of stream) {
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
      }
    },
    [addMessage, thread.id],
  );

  const [loading, setLoading] = useState(created);
  const send = useCallback(() => {
    setLoading(true);
    const newMessageType = {
      role: ConversationRole.USER,
      content: [{ text: newMessage }],
      id: uuid(),
    };
    addMessage(thread.id, newMessageType);
    setNewMessage('');
    void sendMessages(thread.messages.concat(newMessageType));
  }, [addMessage, newMessage, sendMessages, thread.id, thread.messages]);

  // Execute call when thread first created
  const needsTrigger = useRef(created);
  if (needsTrigger.current) {
    needsTrigger.current = false;
    void sendMessages(thread.messages);
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
                send();
              }
            }
          }}
          placeholder="Ask a question"
          value={newMessage}
        />
        {loading ? (
          <CircularProgress sx={{ padding: 1 }} />
        ) : (
          <IconButton disabled={!newMessage.trim()} onClick={send}>
            <ArrowUpwardRounded />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}
