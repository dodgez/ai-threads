import type { ImageBlock } from '@aws-sdk/client-bedrock-runtime';
import { ConversationRole, ImageFormat } from '@aws-sdk/client-bedrock-runtime';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import useTheme from '@mui/material/styles/useTheme';
import TextField from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useCallback, useState } from 'react';
import { v4 as uuid } from 'uuid';

import Suggestion from './Suggestion';
import type { ThreadType } from '../useThreadStore';
import { useThreadStore } from '../useThreadStore';

export default function LandingPage({
  onCreate,
}: {
  onCreate: (id: ThreadType['id']) => void;
}) {
  const createThread = useThreadStore((state) => state.createThread);
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<
    (ImageBlock & { id: string; name: string })[]
  >([]);

  const send = useCallback(() => {
    const newId = createThread({
      role: ConversationRole.USER,
      content: [
        { text: message },
        ...images.map((image) => ({
          image,
        })),
      ],
      id: uuid(),
    });
    onCreate(newId);
  }, [createThread, images, message, onCreate]);

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
      <Box
        alignItems="end"
        bottom={0}
        pb={2}
        position="sticky"
        px={2}
        sx={{ backgroundColor: (theme) => theme.palette.background.default }}
      >
        <Box display="flex">
          <TextField
            fullWidth
            multiline
            onChange={({ target }) => {
              setMessage(target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (message.trim()) {
                  send();
                }
              }
            }}
            onPaste={(event) => {
              const data = event.clipboardData;
              if (data.files.length > 0) {
                for (const file of data.files) {
                  if (file.type !== 'image/png') {
                    alert(`Skipping unsupported file: ${file.type}`);
                    continue;
                  }
                  void file.arrayBuffer().then((buffer) => {
                    const bytes = new Uint8Array(buffer);
                    setImages((images) =>
                      images.concat({
                        format: ImageFormat.PNG,
                        source: {
                          bytes,
                        },
                        id: uuid(),
                        name: file.name,
                      }),
                    );
                  });
                }
              }
            }}
            placeholder="Ask a question"
            value={message}
          />
          <IconButton
            disabled={!message.trim()}
            onClick={() => {
              send();
            }}
          >
            <ArrowUpwardRounded />
          </IconButton>
        </Box>
        {images.length > 0 && (
          <Container maxWidth="md" sx={{ overflowX: 'auto', pt: 1 }}>
            <Stack direction="row" spacing={1}>
              {images.map((image) => (
                <Chip
                  key={image.id}
                  label={image.name}
                  onDelete={() => {
                    setImages((images) =>
                      images.filter((image2) => image2.id !== image.id),
                    );
                  }}
                />
              ))}
            </Stack>
          </Container>
        )}
      </Box>
    </Box>
  );
}
