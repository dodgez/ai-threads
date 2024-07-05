import type {
  Message as BedrockMessage,
  ContentBlock,
  DocumentBlock,
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
import { enqueueSnackbar } from 'notistack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

import Input from './Input';
import Message from './Message';
import type { MessageType, ThreadType } from '../useThreadStore';
import { useThreadStore } from '../useThreadStore';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const electron = require('electron');

function isScrolledBottom() {
  const scrollPosition = window.scrollY;
  const documentHeight =
    document.documentElement.scrollHeight || document.body.scrollHeight;
  const windowHeight = window.innerHeight;

  const scrollThreshold = 110;
  return documentHeight - (scrollPosition + windowHeight) <= scrollThreshold;
}

export default function Thread({
  created,
  thread,
}: {
  created: boolean;
  thread: ThreadType;
}) {
  const addMessage = useThreadStore((state) => state.addMessage);
  const addTokens = useThreadStore((state) => state.addTokens);
  const awsCredProfile = useThreadStore((state) => state.awsCredProfile);
  const [streamingResponse, setStreamingResponse] =
    useState<MessageType['content']>();

  // Used for scrolling messages into view
  const bottomRef = useRef<HTMLDivElement>(null);

  // Used for focusing the input after response
  const inputRef = useRef<HTMLInputElement>(null);

  const aborted = useRef(false);
  const onCancel = useCallback(() => {
    aborted.current = true;
  }, []);

  useEffect(() => {
    window.scrollTo({
      behavior: 'smooth',
      top: 0,
    });
  }, [thread.id]);

  const sendMessages = useCallback(
    async (messages: BedrockMessage[]) => {
      const cleanup = () => {
        aborted.current = false;
        setLoading(false);
        setStreamingResponse(undefined);
        setTimeout(() => inputRef.current?.focus(), 0);
        if (isScrolledBottom()) {
          bottomRef.current?.scrollIntoView({
            behavior: 'auto',
          });
        }
      };

      const creds = (await electron.ipcRenderer
        .invoke('creds', awsCredProfile)
        .catch((e: unknown) => {
          enqueueSnackbar(`Error getting credentials: ${JSON.stringify(e)}`, {
            autoHideDuration: 3000,
            variant: 'error',
          });
        })) as AwsCredentialIdentity | undefined;

      if (!creds) {
        cleanup();
        return;
      }

      const client = new BedrockRuntimeClient({
        credentials: creds,
        region: 'us-west-2',
      });
      const command = new ConverseStreamCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        messages,
      });

      const { stream } = await client.send(command).catch((e: unknown) => {
        enqueueSnackbar(`Error sending messages: ${JSON.stringify(e)}`, {
          autoHideDuration: 3000,
          variant: 'error',
        });
        return { stream: undefined };
      });

      if (!stream) {
        cleanup();
        return;
      }

      let content: ContentBlock[] = [];
      try {
        for await (const data of stream) {
          if (data.messageStart) {
            setStreamingResponse([{ text: '' }]);
            content = [{ text: '' }];
          } else if (data.contentBlockDelta) {
            if (aborted.current) {
              continue;
            }
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
                    content[index].text = text;
                  } else {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    response[index].text! += text;
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    content[index].text! += text;
                  }

                  return response;
                });
                if (isScrolledBottom()) {
                  bottomRef.current?.scrollIntoView({
                    behavior: 'auto',
                  });
                }
              }
            }
          } else if (data.metadata) {
            if (
              data.metadata.usage?.inputTokens === undefined ||
              data.metadata.usage.outputTokens == undefined
            ) {
              continue;
            }
            addTokens(
              data.metadata.usage.inputTokens,
              data.metadata.usage.outputTokens,
            );
          }
        }

        addMessage(thread.id, {
          role: ConversationRole.ASSISTANT,
          content,
          id: uuid(),
        });
      } catch (e: unknown) {
        enqueueSnackbar(`Error reading response: ${JSON.stringify(e)}`, {
          autoHideDuration: 3000,
          variant: 'error',
        });
      } finally {
        cleanup();
      }
    },
    [addMessage, addTokens, awsCredProfile, thread.id],
  );

  const [loading, setLoading] = useState(created);
  const onSubmit = useCallback(
    (message: string, docs: DocumentBlock[], images: ImageBlock[]) => {
      setLoading(true);
      if (
        thread.messages.length > 0 &&
        thread.messages[thread.messages.length - 1].role ===
          ConversationRole.USER
      ) {
        void sendMessages(thread.messages);
      } else {
        const newMessage = {
          role: ConversationRole.USER,
          content: [
            { text: message, id: uuid() },
            ...docs.map((doc) => ({
              document: doc,
              id: uuid(),
            })),
            ...images.map((image) => ({
              image,
              id: uuid(),
            })),
          ],
          id: uuid(),
        };
        addMessage(thread.id, newMessage);
        void sendMessages(thread.messages.concat(newMessage));
      }
    },
    [addMessage, sendMessages, thread.id, thread.messages],
  );

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
            <Message key={message.id} message={message} thread={thread} />
          ))}
          {streamingResponse && (
            <Message
              message={{
                role: ConversationRole.ASSISTANT,
                content: streamingResponse,
                id: undefined,
              }}
              thread={thread}
            />
          )}
          <Box mt="0px !important" ref={bottomRef} />
        </Stack>
      </Container>
      <Input
        inputRef={inputRef}
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
        overrideCanSubmit={
          thread.messages.length > 0 &&
          thread.messages[thread.messages.length - 1].role ===
            ConversationRole.USER
        }
      />
    </Box>
  );
}
