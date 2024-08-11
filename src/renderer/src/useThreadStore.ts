import type { Message as BedrockMessage } from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockRuntimeClient,
  ConversationRole,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { AwsCredentialIdentity } from '@smithy/types';
import { del, get, set } from 'idb-keyval';
import { v4 as uuid } from 'uuid';
import { create } from 'zustand';
import type { StateStorage } from 'zustand/middleware';
import { createJSONStorage, persist } from 'zustand/middleware';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ipcRenderer } = require('electron');

export type MessageType = BedrockMessage & { id: string };
export interface ThreadType {
  id: string;
  messages: MessageType[];
  model?: string;
  name: string;
}

const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> =>
    (await get(name)) ?? null,
  setItem: async (name: string, value: string): Promise<void> =>
    set(name, value),
  removeItem: async (name: string): Promise<void> => del(name),
};

interface StoreState {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  awsCredProfile?: string;
  setAwsCredProfile: (state?: string) => void;
  threads: Record<ThreadType['id'], ThreadType | undefined>;
  createThread: (message: MessageType, model: string) => ThreadType['id'];
  renameThread: (id: ThreadType['id'], name: string) => void;
  deleteThread: (id: ThreadType['id']) => void;
  setThreadModel: (id: ThreadType['id'], model: string) => void;
  addMessage: (id: ThreadType['id'], message: MessageType) => void;
  removeMessage: (id: ThreadType['id'], messageId: MessageType['id']) => void;
  tokens: { input: number; output: number };
  addTokens: (input: number, output: number) => void;
}

export const useThreadStore = create<StoreState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
      awsCredProfile: undefined,
      setAwsCredProfile: (state?: string) => {
        set({ awsCredProfile: state });
      },
      threads: {},
      createThread: (message: MessageType, model: string) => {
        const id = uuid();
        set(({ threads }) => {
          const newThreads = { ...threads };
          newThreads[id] = {
            id,
            messages: [message],
            model,
            name: 'New chat',
          };
          return { threads: newThreads };
        });

        void (async () => {
          if (!message.content?.[0]?.text) return 'New chat';
          const messages = [
            {
              role: ConversationRole.USER,
              content: [
                {
                  text: `Based on this opening question: "${message.content[0].text}", what would be a concise and descriptive name for this conversation thread? Only provide the name, not any other information or explanation.`,
                },
              ],
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
            modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
            messages,
          });

          const { output } = await client.send(command);
          return output?.message?.content?.[0]?.text ?? 'New chat';
        })().then((name) => {
          set(({ threads }) => {
            const newThreads = { ...threads };
            if (!newThreads[id]) return { threads };
            newThreads[id] = {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              ...newThreads[id]!,
              name,
            };
            return { threads: newThreads };
          });
        });

        return id;
      },
      renameThread: (id: ThreadType['id'], name: string) => {
        set(({ threads }) => {
          const newThreads = { ...threads };
          if (!newThreads[id]) return { threads };

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          newThreads[id] = { ...newThreads[id]!, name };
          return { threads: newThreads };
        });
      },
      deleteThread: (id: ThreadType['id']) => {
        set(({ threads }) => {
          const newThreads = { ...threads };
          newThreads[id] = undefined;
          return { threads: newThreads };
        });
      },
      setThreadModel: (id: ThreadType['id'], model: string) => {
        set(({ threads }) => {
          const newThreads = { ...threads };
          if (!newThreads[id]) return { threads };

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          newThreads[id] = { ...newThreads[id]!, model };
          return { threads: newThreads };
        });
      },
      addMessage: (id: ThreadType['id'], message: MessageType) => {
        set(({ threads }) => {
          const newThreads = { ...threads };
          const thread = newThreads[id];
          if (!thread) return { threads };

          newThreads[id] = {
            id,
            messages: thread.messages.concat(message),
            model: thread.model,
            name: thread.name,
          };
          return { threads: newThreads };
        });
      },
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
          };
          return { threads: newThreads };
        });
      },
      tokens: { input: 0, output: 0 },
      addTokens: (input: number, output: number) => {
        set(({ tokens }) => ({
          tokens: {
            input: tokens.input + input,
            output: tokens.output + output,
          },
        }));
      },
    }),
    {
      name: 'bedrock-threads',
      onRehydrateStorage: () => (state?: StoreState) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) =>
            ['threads', 'tokens'].includes(key),
          ),
        ),
      storage: createJSONStorage(() => storage),
    },
  ),
);
