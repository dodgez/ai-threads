import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createOpenAI } from '@ai-sdk/openai';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import Menu from '@mui/icons-material/Menu';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { AwsCredentialIdentity } from '@smithy/types';
import type { CoreMessage, LanguageModel } from 'ai';
import { streamText } from 'ai';
import { enqueueSnackbar } from 'notistack';
import numeral from 'numeral';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { throttle } from 'throttle-debounce';
import { v4 as uuid } from 'uuid';

import Input from './Input';
import Message from './Message';
import type {
  FilePart,
  ImagePart,
  MessageType,
  TextPart,
  ThreadType,
} from '../types';
import { ModelMetadata, Provider } from '../types';
import { useThreadStore } from '../useThreadStore';

const { ipcRenderer } = window.require('electron');

function isScrolledBottom() {
  const scrollPosition = window.scrollY;
  const documentHeight =
    document.documentElement.scrollHeight || document.body.scrollHeight;
  const windowHeight = window.innerHeight;

  const scrollThreshold = 110;
  return documentHeight - (scrollPosition + windowHeight) <= scrollThreshold;
}

async function getSecretKey(
  name: string,
  creds: AwsCredentialIdentity,
  defaultKey?: string,
): Promise<string | undefined> {
  if (defaultKey) return defaultKey;

  const client = new SecretsManagerClient({
    credentials: creds,
    region: 'us-west-2',
  });
  const command = new GetSecretValueCommand({
    SecretId: 'ai-threads/api-keys',
  });
  const apiKeyResponse = await client.send(command);
  const secrets: Record<string, string | undefined> =
    apiKeyResponse.SecretString
      ? (JSON.parse(apiKeyResponse.SecretString) as Record<string, string>)
      : {};

  return secrets[name];
}

export default function Thread({
  created,
  drawerOpen,
  setDrawerOpen,
  thread,
}: {
  created: boolean;
  drawerOpen: boolean;
  setDrawerOpen: Dispatch<SetStateAction<boolean>>;
  thread: ThreadType;
}) {
  const addMessage = useThreadStore((state) => state.addMessage);
  const addTokens = useThreadStore((state) => state.addTokens);
  const awsCredProfile = useThreadStore((state) => state.awsCredProfile);
  const openAIKey = useThreadStore((state) => state.openAIKey);
  const [streamingResponse, setStreamingResponse] = useState<{
    response: string;
    threadId: ThreadType['id'];
  }>();

  // Used for scrolling messages into view
  const bottomRef = useRef<HTMLDivElement>(null);

  // Used for focusing the input after response
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (streamingResponse?.threadId === thread.id) {
      bottomRef.current?.scrollIntoView({
        behavior: 'auto',
      });
    } else {
      window.scrollTo({
        behavior: 'auto',
        top: 0,
      });
    }
  }, [streamingResponse?.threadId, thread.id]);

  const [showJump, setShowJump] = useState(false);
  const jumpBottomListener = useCallback(() => {
    setShowJump(!isScrolledBottom());
  }, []);
  useEffect(() => {
    window.addEventListener('scroll', jumpBottomListener);
    jumpBottomListener();

    return () => {
      window.removeEventListener('scroll', jumpBottomListener);
    };
  }, [jumpBottomListener, thread.id]);

  const sendMessages = useCallback(
    async (messages: CoreMessage[]) => {
      const cleanup = () => {
        setLoading(false);
        setStreamingResponse(undefined);
        setTimeout(() => {
          inputRef.current?.focus();
          if (isScrolledBottom()) {
            bottomRef.current?.scrollIntoView({
              behavior: 'auto',
            });
          }
        }, 0);
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

      let model: LanguageModel;
      switch (ModelMetadata[thread.model].provider) {
        case Provider.AmazonBedrock: {
          const bedrock = createAmazonBedrock({
            bedrockOptions: {
              credentials: creds,
              region: 'us-west-2',
            },
          });
          model = bedrock(thread.model);
          break;
        }
        case Provider.OpenAI: {
          const apiKey = await getSecretKey('openai', creds, openAIKey).catch(
            () => {
              enqueueSnackbar(
                'An unexpected error occurred while retrieving OpenAI API key from AWS Secrets Manager.',
                {
                  autoHideDuration: 3000,
                  variant: 'error',
                },
              );
              cleanup();
              return;
            },
          );
          if (!apiKey) {
            enqueueSnackbar('No OpenAI API key provided or found.', {
              autoHideDuration: 3000,
              variant: 'error',
            });
            cleanup();
            return;
          }
          const openAI = createOpenAI({
            apiKey: apiKey,
            compatibility: 'strict',
          });
          model = openAI(thread.model);
          break;
        }
      }

      const { textStream } = await streamText({
        messages,
        model,
        onFinish: (evt) => {
          addMessage(
            thread.id,
            {
              content: [{ text: evt.text, type: 'text' }],
              id: uuid(),
              role: 'assistant',
            },
            evt.usage.promptTokens + evt.usage.completionTokens,
          );
          addTokens(
            thread.model,
            evt.usage.promptTokens,
            evt.usage.completionTokens,
          );
          cleanup();
          setTimeout(jumpBottomListener, 0);
        },
      }).catch((e: unknown) => {
        enqueueSnackbar(`Error sending messages: ${JSON.stringify(e)}`, {
          autoHideDuration: 3000,
          variant: 'error',
        });
        return { textStream: undefined };
      });

      if (!textStream) {
        cleanup();
        return;
      }

      setStreamingResponse({ response: '', threadId: thread.id });
      try {
        const throttledScroll = throttle(300, () => {
          bottomRef.current?.scrollIntoView({
            behavior: 'auto',
          });
        });
        for await (const text of textStream) {
          setStreamingResponse((res) => ({
            response: (res?.response ?? '') + text,
            threadId: thread.id,
          }));
          if (isScrolledBottom()) {
            throttledScroll();
          }
        }
      } catch (e: unknown) {
        enqueueSnackbar(`Error reading response: ${JSON.stringify(e)}`, {
          autoHideDuration: 3000,
          variant: 'error',
        });
        cleanup();
      }
    },
    [
      addMessage,
      addTokens,
      awsCredProfile,
      jumpBottomListener,
      openAIKey,
      thread.id,
      thread.model,
    ],
  );

  const [loading, setLoading] = useState(created);
  const onSubmit = useCallback(
    (message: string, docs: FilePart[], images: ImagePart[]) => {
      setLoading(true);
      if (
        thread.messages.length > 0 &&
        thread.messages[thread.messages.length - 1].role === 'user'
      ) {
        void sendMessages(thread.messages);
      } else {
        const newTextMessage: TextPart = {
          id: uuid(),
          text: message,
          type: 'text',
        };
        const newMessage: MessageType = {
          content: [newTextMessage, ...docs, ...images],
          id: uuid(),
          role: 'user',
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
    <Box display="flex" flexDirection="column" flexGrow={1} mx="auto">
      <Box
        position="sticky"
        sx={{ backgroundColor: (theme) => theme.palette.background.default }}
        top={0}
      >
        <Box alignItems="center" display="flex" pl={drawerOpen ? 1 : 0}>
          {!drawerOpen && (
            <Box>
              <IconButton
                onClick={() => {
                  setDrawerOpen(true);
                }}
              >
                <Menu />
              </IconButton>
            </Box>
          )}
          <Box display="flex" flexDirection="column" flexGrow={1} p={0}>
            <Typography variant="h6">{thread.name}</Typography>
            <Typography color="grey" variant="subtitle1">
              {`${ModelMetadata[thread.model].label} - ${numeral(thread.tokens).format('0.[00]a')} tokens`}
            </Typography>
          </Box>
        </Box>
        <Divider />
      </Box>
      <Container maxWidth="lg" sx={{ flexGrow: 1, p: 2 }}>
        <Stack spacing={2}>
          {thread.messages.map((message) => (
            <Message key={message.id} message={message} thread={thread} />
          ))}
          {streamingResponse && streamingResponse.threadId === thread.id && (
            <Message
              message={{
                content: [{ text: streamingResponse.response, type: 'text' }],
                id: undefined,
                role: 'assistant',
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
            <Box mb={1}>
              <IconButton
                disableRipple
                onClick={() => {
                  bottomRef.current?.scrollIntoView({
                    behavior: 'auto',
                  });
                }}
                sx={{
                  backgroundColor: (theme) => theme.palette.background.default,
                  outline: 'solid 1px grey',
                }}
              >
                <ArrowDownward />
              </IconButton>
            </Box>
          )
        }
        loading={loading}
        modelId={thread.model}
        onSubmit={onSubmit}
        overrideCanSubmit={
          thread.messages.length > 0 &&
          thread.messages[thread.messages.length - 1].role === 'user'
        }
      />
    </Box>
  );
}
