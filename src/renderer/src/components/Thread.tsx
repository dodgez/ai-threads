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
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
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
const { ipcRenderer } = require('electron');

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
  const setThreadModel = useThreadStore((state) => state.setThreadModel);
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

  const [showJump, setShowJump] = useState(false);
  const jumpBottomListener = useCallback(() => {
    if (!isScrolledBottom()) {
      setShowJump(true);
    } else {
      setShowJump(false);
    }
  }, []);
  useEffect(() => {
    window.addEventListener('scroll', jumpBottomListener);
    jumpBottomListener();

    return () => {
      window.removeEventListener('scroll', jumpBottomListener);
    };
  }, [jumpBottomListener, thread.id]);

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

      const creds = (await ipcRenderer
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
        modelId: thread.model,
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
              break;
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
                    (response[index].text as unknown as string) = text;
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
        setTimeout(jumpBottomListener, 0);
      } catch (e: unknown) {
        enqueueSnackbar(`Error reading response: ${JSON.stringify(e)}`, {
          autoHideDuration: 3000,
          variant: 'error',
        });
      } finally {
        cleanup();
      }
    },
    [
      addMessage,
      addTokens,
      awsCredProfile,
      jumpBottomListener,
      thread.id,
      thread.model,
    ],
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
        if (isScrolledBottom()) {
          setTimeout(() => {
            bottomRef.current?.scrollIntoView({
              behavior: 'auto',
            });
          }, 0);
        }
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
          <FormControl fullWidth>
            <InputLabel id="bedrock-model-label">Bedrock model</InputLabel>
            <Select
              label="Bedrock model"
              labelId="bedrock-model-label"
              onChange={({ target }) => {
                setThreadModel(thread.id, target.value);
              }}
              value={thread.model ?? 'anthropic.claude-3-haiku-20240307-v1:0'}
            >
              <MenuItem value="anthropic.claude-3-sonnet-20240229-v1:0">
                Anthropic Claude 3 Sonnet
              </MenuItem>
              <MenuItem value="anthropic.claude-3-haiku-20240307-v1:0">
                Anthropic Claude 3 Haiku
              </MenuItem>
              <MenuItem value="anthropic.claude-3-5-sonnet-20240620-v1:0">
                Anthropic Claude 3.5 Sonnet (no document support)
              </MenuItem>
            </Select>
          </FormControl>
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
        jumpButton={
          showJump && (
            <Box
              mb={1}
              sx={{
                backgroundColor: (theme) => theme.palette.background.default,
              }}
            >
              <Button
                onClick={() => {
                  bottomRef.current?.scrollIntoView({
                    behavior: 'smooth',
                  });
                }}
                variant="outlined"
              >
                Jump to latest message
              </Button>
            </Box>
          )
        }
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
