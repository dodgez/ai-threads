import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createOpenAI } from '@ai-sdk/openai';
import type { AwsCredentialIdentity } from '@smithy/types';
import type { LanguageModel, TextPart } from 'ai';
import { generateText } from 'ai';
import { del, get, set } from 'idb-keyval';
import { enqueueSnackbar } from 'notistack';
import { v4 as uuid } from 'uuid';
import { create } from 'zustand';
import type { StateStorage } from 'zustand/middleware';
import { createJSONStorage, persist } from 'zustand/middleware';

import getSecretKey from './getSecretKey';
import type { MessageType, ThreadType } from './types';
import { ModelId, ModelMetadata, Provider } from './types';
import { getCreds } from './useGetCreds';

const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> =>
    (await get(name)) ?? null,
  removeItem: async (name: string): Promise<void> => del(name),
  setItem: async (name: string, value: string): Promise<void> =>
    set(name, value),
};

export interface StoreState {
  _hasHydrated: boolean;
  addMessage: (
    id: ThreadType['id'],
    message: MessageType,
    tokenInfo?: {
      modelId: ModelId;
      tokens: {
        input: number;
        output: number;
      };
    },
  ) => void;
  addTokens: (model: ModelId, input: number, output: number) => void;
  awsCredProfile?: string;
  awsCreds?: AwsCredentialIdentity;
  createThread: (message: MessageType, model: ModelId) => ThreadType['id'];
  deleteThread: (id: ThreadType['id']) => void;
  openAIKey?: string;
  playbackSpeed: number;
  removeMessage: (id: ThreadType['id'], messageId: MessageType['id']) => void;
  renameThread: (id: ThreadType['id'], name: string) => void;
  setAwsCredProfile: (state?: string) => void;
  setAwsCreds: (state?: AwsCredentialIdentity) => void;
  setHasHydrated: (state: boolean) => void;
  setOpenAIKey: (key?: string) => void;
  setPlaybackSpeed: (playbackSpeed: number) => void;
  setThreadModel: (id: ThreadType['id'], model: ModelId) => void;
  setUseAwsCredProfile: (state: boolean) => void;
  threads: Record<ThreadType['id'], ThreadType | undefined>;
  tokens: Record<ModelId, { input: number; output: number }>;
  useAwsCredProfile?: boolean;
}

export const useThreadStore = create<StoreState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      addMessage: (
        id: ThreadType['id'],
        message: MessageType,
        tokenInfo?: {
          modelId: ModelId;
          tokens: {
            input: number;
            output: number;
          };
        },
      ) => {
        set(({ threads }) => {
          const newThreads = { ...threads };
          const thread = newThreads[id];
          if (!thread) return { threads };

          const newTokens = { ...thread.tokens };
          if (tokenInfo) {
            if (!newTokens[tokenInfo.modelId]) {
              newTokens[tokenInfo.modelId] = tokenInfo.tokens;
            } else {
              newTokens[tokenInfo.modelId] = tokenInfo.tokens;
            }
          }

          newThreads[id] = {
            id,
            messages: thread.messages.concat(message),
            model: thread.model,
            name: thread.name,
            tokens: newTokens,
          };
          return { threads: newThreads };
        });
      },
      addTokens: (model: ModelId, input: number, output: number) => {
        set(({ tokens }) => {
          const newTokens = structuredClone(tokens);

          newTokens[model].input += input;
          newTokens[model].output += output;

          return { tokens: newTokens };
        });
      },
      awsCredProfile: undefined,
      awsCreds: undefined,
      createThread: (message: MessageType, model: ModelId) => {
        const id = uuid();
        set(({ threads }) => {
          const newThreads = { ...threads };
          newThreads[id] = {
            id,
            messages: [message],
            model,
            name: 'New chat',
            tokens: {},
          };
          return { threads: newThreads };
        });

        void (async () => {
          const defaultName = 'New chat';
          const firstMessage =
            typeof message.content === 'string'
              ? message.content
              : (message.content[0] as TextPart | undefined)?.text;
          if (!firstMessage) return defaultName;

          const state = get();
          const creds = await getCreds(
            state.awsCredProfile,
            state.awsCreds,
            state.useAwsCredProfile,
          );
          if (!creds) {
            enqueueSnackbar('Unknown error getting credentials', {
              autoHideDuration: 3000,
              variant: 'error',
            });
            return defaultName;
          }

          let modelClient: LanguageModel;
          switch (ModelMetadata[model].provider) {
            case Provider.AmazonBedrock: {
              const bedrock = createAmazonBedrock({
                bedrockOptions: {
                  credentials: creds,
                  region: 'us-west-2',
                },
              });
              modelClient = bedrock(model);
              break;
            }
            case Provider.OpenAI: {
              const apiKey = await getSecretKey(
                'openai',
                creds,
                get().openAIKey,
              ).catch(() => {
                enqueueSnackbar(
                  'An unexpected error occurred while retrieving OpenAI API key from AWS Secrets Manager.',
                  {
                    autoHideDuration: 3000,
                    variant: 'error',
                  },
                );
                return;
              });
              if (!apiKey) {
                enqueueSnackbar('No OpenAI API key provided or found.', {
                  autoHideDuration: 3000,
                  variant: 'error',
                });
                return defaultName;
              }
              const openAI = createOpenAI({
                apiKey: apiKey,
                compatibility: 'strict',
              });
              modelClient = openAI(model);
              break;
            }
          }

          const { text } = await generateText({
            messages: [
              {
                content: [
                  {
                    text: `Based on this opening question: "${firstMessage}", what would be a concise and descriptive name for this conversation thread? Only provide the name, not any other information or explanation. Do not put quotes around the name.`,
                    type: 'text',
                  },
                ],
                role: 'user',
              },
            ],
            model: modelClient,
          });
          return text;
        })().then((name) => {
          set(({ threads }) => {
            const newThreads = { ...threads };
            if (!newThreads[id]) return { threads };
            newThreads[id] = {
              ...newThreads[id],
              name,
            };
            return { threads: newThreads };
          });
        });

        return id;
      },
      deleteThread: (id: ThreadType['id']) => {
        set(({ threads }) => {
          const newThreads = { ...threads };
          newThreads[id] = undefined;
          return { threads: newThreads };
        });
      },
      openAIKey: undefined,
      playbackSpeed: 1.5,
      removeMessage: (id: ThreadType['id'], messageId: MessageType['id']) => {
        set(({ threads }) => {
          const newThreads = { ...threads };
          const thread = newThreads[id];
          if (!thread) return { threads };

          newThreads[id] = {
            id,
            messages: thread.messages.filter(
              (message) => message.id !== messageId,
            ),
            model: thread.model,
            name: thread.name,
            tokens: thread.tokens,
          };
          return { threads: newThreads };
        });
      },
      renameThread: (id: ThreadType['id'], name: string) => {
        set(({ threads }) => {
          const newThreads = { ...threads };
          if (!newThreads[id]) return { threads };

          newThreads[id] = { ...newThreads[id], name };
          return { threads: newThreads };
        });
      },
      setAwsCredProfile: (state?: string) => {
        set({ awsCredProfile: state });
      },
      setAwsCreds: (state?: AwsCredentialIdentity) => {
        set({ awsCreds: state });
      },
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
      setOpenAIKey: (key?: string) => {
        set({ openAIKey: key });
      },
      setPlaybackSpeed: (playbackSpeed: number) => {
        set({ playbackSpeed });
      },
      setThreadModel: (id: ThreadType['id'], model: ModelId) => {
        set(({ threads }) => {
          const newThreads = { ...threads };
          if (!newThreads[id]) return { threads };

          newThreads[id] = { ...newThreads[id], model };
          return { threads: newThreads };
        });
      },
      setUseAwsCredProfile(state: boolean) {
        set({ useAwsCredProfile: state });
      },
      threads: {},
      tokens: {
        [ModelId.Claude35Sonnet]: {
          input: 0,
          output: 0,
        },
        [ModelId.Claude3Haiku]: {
          input: 0,
          output: 0,
        },
        [ModelId.Claude3Sonnet]: {
          input: 0,
          output: 0,
        },
        [ModelId.GPT4o]: {
          input: 0,
          output: 0,
        },
        [ModelId.GPT4oMini]: {
          input: 0,
          output: 0,
        },
      },
      useAwsCredProfile: typeof window.require === 'function',
    }),
    {
      name: 'ai-threads',
      onRehydrateStorage: () => (state?: StoreState) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) =>
            [
              'awsCredProfile',
              'awsCreds',
              'openAIKey',
              'playbackSpeed',
              'threads',
              'tokens',
              'useAwsCredProfile',
            ].includes(key),
          ),
        ),
      storage: createJSONStorage(() => storage),
    },
  ),
);
