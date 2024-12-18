import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createOpenAI } from '@ai-sdk/openai';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { AwsCredentialIdentity } from '@smithy/types';
import type { CoreMessage, LanguageModel } from 'ai';
import { streamText } from 'ai';
import { enqueueSnackbar } from 'notistack';
import numeral from 'numeral';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { throttle } from 'throttle-debounce';
import { v4 as uuid } from 'uuid';

import Input from './Input';
import Message from './Message';
import getSecretKey from '../getSecretKey';
import type {
  FilePart,
  ImagePart,
  MessageType,
  ModelId,
  TextPart,
  ThreadType,
} from '../types';
import { ModelMetadata, Provider } from '../types';
import useGetCreds from '../useGetCreds';
import { useThreadStore } from '../useThreadStore';

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
  const openAIKey = useThreadStore((state) => state.openAIKey);
  const setThreadModel = useThreadStore((state) => state.setThreadModel);
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

  const getCreds = useGetCreds();
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

      const creds = (await getCreds().catch((e: unknown) => {
        enqueueSnackbar(`Error getting credentials: ${JSON.stringify(e)}`, {
          autoHideDuration: 3000,
          variant: 'error',
        });
      })) as AwsCredentialIdentity | undefined;

      if (!creds) {
        enqueueSnackbar(`Unknown error getting credentials`, {
          autoHideDuration: 3000,
          variant: 'error',
        });
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
            {
              modelId: thread.model,
              tokens: {
                input: evt.usage.promptTokens,
                output: evt.usage.completionTokens,
              },
            },
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
      getCreds,
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

  const cost = useMemo(
    () =>
      Object.entries(thread.tokens).reduce(
        (cost, [modelId, { input, output }]) =>
          cost +
          (ModelMetadata[modelId as ModelId].pricing.input * input) /
            1_000_000 +
          (ModelMetadata[modelId as ModelId].pricing.output * output) /
            1_000_000,
        0,
      ),
    [thread.tokens],
  );

  return (
    <Box display="flex" flexDirection="column" flexGrow={1} mx="auto">
      <Box
        position="sticky"
        sx={{ backgroundColor: (theme) => theme.palette.background.default }}
        top={0}
        zIndex={1}
      >
        <Box alignItems="center" display="flex" pl={1} pr={1}>
          <Box display="flex" flexDirection="column" flexGrow={1} p={0}>
            <Typography variant="h6">{thread.name}</Typography>
            <Typography color="grey" variant="subtitle1">
              {`Total cost: ~$${numeral(cost).format('0.00a')}`}
            </Typography>
          </Box>
          <Select
            onChange={({ target }) => {
              setThreadModel(thread.id, target.value as ModelId);
            }}
            sx={{
              'div:focus': {
                backgroundColor: (theme) => theme.palette.background.default,
              },
            }}
            value={thread.model}
            variant="standard"
          >
            {Object.entries(ModelMetadata).map(([modelId, modelMetadata]) => (
              <MenuItem key={modelId} value={modelId}>
                {modelMetadata.label}
              </MenuItem>
            ))}
          </Select>
        </Box>
        <Divider />
      </Box>
      <Box flexGrow={1} p={2}>
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
      </Box>
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
