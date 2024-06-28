import type { ImageBlock } from '@aws-sdk/client-bedrock-runtime';
import { ImageFormat } from '@aws-sdk/client-bedrock-runtime';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';

export default function Input({
  loading = false,
  onSubmit: onSubmit,
}: {
  loading?: boolean;
  onSubmit: (message: string, images: ImageBlock[]) => void;
}) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<
    (ImageBlock & { id: string; name: string })[]
  >([]);

  return (
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
          disabled={loading}
          fullWidth
          multiline
          onChange={({ target }) => {
            setMessage(target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (message.trim()) {
                onSubmit(message, images);
                setMessage('');
                setImages([]);
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
        {loading ? (
          <CircularProgress sx={{ padding: 1 }} />
        ) : (
          <IconButton
            disabled={!message.trim()}
            onClick={() => {
              onSubmit(message, images);
              setMessage('');
              setImages([]);
            }}
          >
            <ArrowUpwardRounded />
          </IconButton>
        )}
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
  );
}
