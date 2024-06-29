import type {
  DocumentBlock,
  ImageBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationRole } from '@aws-sdk/client-bedrock-runtime';
import Box from '@mui/material/Box';
import useTheme from '@mui/material/styles/useTheme';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useCallback } from 'react';
import { v4 as uuid } from 'uuid';

import Input from './Input';
import Suggestion from './Suggestion';
import type { ThreadType } from '../useThreadStore';
import { useThreadStore } from '../useThreadStore';

export default function LandingPage({
  onCreate,
}: {
  onCreate: (id: ThreadType['id']) => void;
}) {
  const createThread = useThreadStore((state) => state.createThread);

  const onSubmit = useCallback(
    (message: string, docs: DocumentBlock[], images: ImageBlock[]) => {
      const newId = createThread({
        role: ConversationRole.USER,
        content: [
          { text: message },
          ...docs.map((doc) => ({
            document: doc,
          })),
          ...images.map((image) => ({
            image,
          })),
        ],
        id: uuid(),
      });
      onCreate(newId);
    },
    [createThread, onCreate],
  );

  const theme = useTheme();
  const mdMediaQuery = useMediaQuery(theme.breakpoints.up('md'));
  const lgMediaQuery = useMediaQuery(theme.breakpoints.up('lg'));

  return (
    <Box
      display="flex"
      flexDirection="column"
      flexGrow={1}
      height="100%"
      mx="auto"
    >
      <Box alignContent="center" flexGrow={1}>
        <Box display="flex" flexDirection="row" justifyContent="space-around">
          <Suggestion
            header="Programming"
            suggestion="Implement FizzBuzz in JavaScript."
          />
          {mdMediaQuery && (
            <Suggestion
              header="Science"
              suggestion="How many planets are in the Solar System?"
            />
          )}
          {lgMediaQuery && (
            <Suggestion
              header="Literature"
              suggestion="Write a Haiku about Rabbits."
            />
          )}
        </Box>
      </Box>
      <Input onSubmit={onSubmit} />
    </Box>
  );
}
