import type { Message as BedrockMessage } from '@aws-sdk/client-bedrock-runtime';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

export type MessageType = BedrockMessage & { id: string };
export interface ThreadType {
  id: string;
  messages: MessageType[];
  name: string;
}

const ThreadContext = createContext<
  | {
      threads: ThreadType[];
      setThreads: Dispatch<SetStateAction<ThreadType[]>>;
      deleteThread: (threadId: ThreadType['id']) => void;
      activeThread: ThreadType['id'] | undefined;
      setActiveThread: Dispatch<SetStateAction<ThreadType['id'] | undefined>>;
    }
  | undefined
>(undefined);

export default function ThreadProvider({ children }: { children: ReactNode }) {
  const now = Date.now().toString();
  const [threads, setThreads] = useState<ThreadType[]>([
    { messages: [], id: now, name: 'New chat' },
  ]);
  const [activeThread, setActiveThread] = useState<
    ThreadType['id'] | undefined
  >(now);

  const deleteThread = useCallback((threadId: ThreadType['id']) => {
    setThreads((threads) => {
      const remaining = threads.filter((thread) => thread.id !== threadId);
      if (remaining.length === 0) {
        const now = Date.now().toString();
        remaining.push({ messages: [], id: now, name: 'New chat' });
        setActiveThread(now);
      } else {
        setActiveThread(threads[0].id);
      }
      return remaining;
    });
  }, []);

  return (
    <ThreadContext.Provider
      value={{
        threads,
        setThreads,
        deleteThread,
        activeThread,
        setActiveThread,
      }}
    >
      {children}
    </ThreadContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useThreads() {
  const threads = useContext(ThreadContext);

  if (!threads) {
    throw new Error('Threads must be used within a Threads.Provider');
  }

  return threads;
}
