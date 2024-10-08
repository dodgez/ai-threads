import {
  BedrockRuntimeClient,
  ConversationRole,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { AwsCredentialIdentity } from '@smithy/types';
import type { TextPart } from 'ai';
import { del, get, set } from 'idb-keyval';
import { v4 as uuid } from 'uuid';
import { create } from 'zustand';
import type { StateStorage } from 'zustand/middleware';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { MessageType, ThreadType } from './types';
import { ModelId } from './types';

const { ipcRenderer } = window.require('electron');

const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> =>
    (await get(name)) ?? null,
  removeItem: async (name: string): Promise<void> => del(name),
  setItem: async (name: string, value: string): Promise<void> =>
    set(name, value),
};

interface StoreState {
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
  closeDrawer: boolean;
  createThread: (message: MessageType, model: ModelId) => ThreadType['id'];
  deleteThread: (id: ThreadType['id']) => void;
  openAIKey?: string;
  playbackSpeed: number;
  removeMessage: (id: ThreadType['id'], messageId: MessageType['id']) => void;
  renameThread: (id: ThreadType['id'], name: string) => void;
  setAwsCredProfile: (state?: string) => void;
  setCloseDrawer: (state: boolean) => void;
  setHasHydrated: (state: boolean) => void;
  setOpenAIKey: (key?: string) => void;
  setPlaybackSpeed: (playbackSpeed: number) => void;
  setThreadModel: (id: ThreadType['id'], model: ModelId) => void;
  threads: Record<ThreadType['id'], ThreadType | undefined>;
  tokens: Record<ModelId, { input: number; output: number }>;
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
      closeDrawer: false,
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
          const firstMessage =
            typeof message.content === 'string'
              ? message.content
              : (message.content[0] as TextPart | undefined)?.text;
          if (!firstMessage) return 'New chat';
          const messages = [
            {
              content: [
                {
                  text: `Based on this opening question: "${firstMessage}", what would be a concise and descriptive name for this conversation thread? Only provide the name, not any other information or explanation. Do not put quotes around the name.`,
                },
              ],
              role: ConversationRole.USER,
            },
          ];
          const profile = get().awsCredProfile;
          const creds = (await ipcRenderer.invoke(
            'creds',
            profile,
          )) as AwsCredentialIdentity;

          const client = new BedrockRuntimeClient({
            credentials: creds,
            region: 'us-west-2',
          });
          const command = new ConverseCommand({
            messages,
            modelId: ModelId.Claude3Haiku,
          });

          const { output } = await client.send(command);
          return output?.message?.content?.[0]?.text ?? 'New chat';
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
      setCloseDrawer: (state: boolean) => {
        set({ closeDrawer: state });
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
              'closeDrawer',
              'openAIKey',
              'playbackSpeed',
              'threads',
              'tokens',
            ].includes(key),
          ),
        ),
      storage: createJSONStorage(() => storage),
    },
  ),
);
