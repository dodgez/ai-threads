import type { Message as BedrockMessage } from '@aws-sdk/client-bedrock-runtime';
import { v4 as uuid } from 'uuid';
import { create } from 'zustand';

export type MessageType = BedrockMessage & { id: string };
export interface ThreadType {
  id: string;
  messages: MessageType[];
  name: string;
}

export const useThreadStore = create<{
  threads: Map<ThreadType['id'], ThreadType>;
  createThread: (message: MessageType) => ThreadType['id'];
  renameThread: (id: ThreadType['id'], name: string) => void;
  deleteThread: (id: ThreadType['id']) => void;
  addMessage: (id: ThreadType['id'], message: MessageType) => void;
}>()((set) => ({
  threads: new Map<ThreadType['id'], ThreadType>(),
  createThread: (message: MessageType) => {
    const id = uuid();
    set(({ threads }) => {
      const newThreads = new Map(threads);
      newThreads.set(id, {
        id,
        messages: [message],
        name: 'New chat',
      });
      return { threads: newThreads };
    });
    return id;
  },
  renameThread: (id: ThreadType['id'], name: string) => {
    set(({ threads }) => {
      const newThreads = new Map(threads);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      newThreads.set(id, { ...newThreads.get(id)!, name });
      return { threads: newThreads };
    });
  },
  deleteThread: (id: ThreadType['id']) => {
    set(({ threads }) => {
      const newThreads = new Map(threads);
      newThreads.delete(id);
      return { threads: newThreads };
    });
  },
  addMessage: (id: ThreadType['id'], message: MessageType) => {
    set(({ threads }) => {
      const newThreads = new Map(threads);
      const thread = newThreads.get(id);
      if (!thread) return { threads };

      newThreads.set(id, {
        id,
        messages: thread.messages.concat(message),
        name: thread.name,
      });
      return { threads: newThreads };
    });
  },
}));
