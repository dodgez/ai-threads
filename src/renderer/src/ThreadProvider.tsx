import type { Message as BedrockMessage } from '@aws-sdk/client-bedrock-runtime';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createContext, useContext, useState } from 'react';

export type MessageType = BedrockMessage & { id: string };
export interface ThreadType {
  id: string;
  messages: MessageType[];
}

const ThreadContext = createContext<
  | {
      threads: ThreadType[];
      setThreads: Dispatch<SetStateAction<ThreadType[]>>;
      activeThread: ThreadType['id'] | undefined;
      setActiveThread: Dispatch<SetStateAction<ThreadType['id'] | undefined>>;
    }
  | undefined
>(undefined);

export default function ThreadProvider({ children }: { children: ReactNode }) {
  const now = Date.now().toString();
  const [threads, setThreads] = useState<ThreadType[]>([
    { messages: [], id: now },
  ]);
  const [activeThread, setActiveThread] = useState<
    ThreadType['id'] | undefined
  >(now);

  return (
    <ThreadContext.Provider
      value={{ threads, setThreads, activeThread, setActiveThread }}
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
