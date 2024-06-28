import type {
  Message as BedrockMessage,
  ContentBlock,
  ImageBlock,
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockRuntimeClient,
  ConversationRole,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import type { AwsCredentialIdentity } from '@smithy/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

import Input from './Input';
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
            setTimeout(() => {
              addMessage(thread.id, {
                role: ConversationRole.ASSISTANT,
                content: res,
                id: uuid(),
              });
            }, 0);
            return undefined;
          });
        }
      }
    },
    [addMessage, thread.id],
  );

  const [loading, setLoading] = useState(created);
  const onSubmit = useCallback(
    (message: string, images: ImageBlock[]) => {
      setLoading(true);
      const newMessage = {
        role: ConversationRole.USER,
        content: [
          { text: message },
          ...images.map((image) => ({
            image,
          })),
        ],
        id: uuid(),
      };
      addMessage(thread.id, newMessage);
      void sendMessages(thread.messages.concat(newMessage));
    },
    [addMessage, sendMessages, thread.id, thread.messages],
  );

  // Execute call when thread first created
  const needsTrigger = useRef(created);
  if (needsTrigger.current) {
    needsTrigger.current = false;
    void sendMessages(thread.messages);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'instant',
    });
  }, [thread.messages]);

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
      <Input loading={loading} onSubmit={onSubmit} />
    </Box>
  );
}
