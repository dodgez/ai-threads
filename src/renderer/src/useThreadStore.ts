import type { Message as BedrockMessage } from '@aws-sdk/client-bedrock-runtime';
import { del, get, set } from 'idb-keyval';
import { v4 as uuid } from 'uuid';
import { create } from 'zustand';
import type { StateStorage } from 'zustand/middleware';
import { createJSONStorage, persist } from 'zustand/middleware';

export type MessageType = BedrockMessage & { id: string };
export interface ThreadType {
  id: string;
  messages: MessageType[];
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
  threads: Record<ThreadType['id'], ThreadType | undefined>;
  createThread: (message: MessageType) => ThreadType['id'];
  renameThread: (id: ThreadType['id'], name: string) => void;
  deleteThread: (id: ThreadType['id']) => void;
  addMessage: (id: ThreadType['id'], message: MessageType) => void;
}

export const useThreadStore = create<StoreState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
      threads: {},
      createThread: (message: MessageType) => {
        const id = uuid();
        set(({ threads }) => {
          const newThreads = { ...threads };
          newThreads[id] = {
            id,
            messages: [message],
            name: 'New chat',
          };
          return { threads: newThreads };
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
      addMessage: (id: ThreadType['id'], message: MessageType) => {
        set(({ threads }) => {
          const newThreads = { ...threads };
          const thread = newThreads[id];
          if (!thread) return { threads };

          newThreads[id] = {
            id,
            messages: thread.messages.concat(message),
            name: thread.name,
          };
          return { threads: newThreads };
        });
      },
    }),
    {
      name: 'bedrock-threads',
      onRehydrateStorage: () => (state?: StoreState) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => ['threads'].includes(key)),
        ),
      storage: createJSONStorage(() => storage),
    },
  ),
);
