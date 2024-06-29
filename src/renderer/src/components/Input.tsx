import type {
  DocumentBlock,
  ImageBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { DocumentFormat, ImageFormat } from '@aws-sdk/client-bedrock-runtime';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import CloudUpload from '@mui/icons-material/CloudUpload';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useCallback, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

const DocMimeTypeMapping: Record<string, DocumentFormat> = {
  'application/msword': DocumentFormat.DOC,
  'application/pdf': DocumentFormat.PDF,
  'application/vnd.ms-excel': DocumentFormat.XLS,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    DocumentFormat.XLSX,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    DocumentFormat.DOCX,
  'text/csv': DocumentFormat.CSV,
  'text/html': DocumentFormat.HTML,
  'text/markdown': DocumentFormat.MD,
  'text/plain': DocumentFormat.TXT,
};

const ImageMimeTypeMapping: Record<string, ImageFormat> = {
  'image/gif': ImageFormat.GIF,
  'image/jpeg': ImageFormat.JPEG,
  'image/png': ImageFormat.PNG,
  'image/webp': ImageFormat.WEBP,
};

export default function Input({
  loading = false,
  onSubmit: onSubmit,
}: {
  loading?: boolean;
  onSubmit: (
    message: string,
    docs: DocumentBlock[],
    images: ImageBlock[],
  ) => void;
}) {
  const [message, setMessage] = useState('');
  const [docs, setDocs] = useState<(DocumentBlock & { id: string })[]>([]);
  const [images, setImages] = useState<
    (ImageBlock & { id: string; name: string })[]
  >([]);

  const uploadDocs = useCallback(async (files: File[]) => {
    const newDocs: (DocumentBlock & { id: string; name: string })[] =
      await Promise.all(
        files.map(async (file) => {
          const format = DocMimeTypeMapping[file.type];
          const bytes = new Uint8Array(await file.arrayBuffer());
          return {
            format,
            source: {
              bytes,
            },
            id: uuid(),
            name: file.name.replace(/\.\w+$/, ''),
          };
        }),
      );

    setDocs((docs) => docs.concat(newDocs));
  }, []);
  const uploadImages = useCallback(async (files: File[]) => {
    const newImages = await Promise.all(
      files.map(async (file) => {
        const format = ImageMimeTypeMapping[file.type];
        const bytes = new Uint8Array(await file.arrayBuffer());
        return {
          format,
          source: {
            bytes,
          },
          id: uuid(),
          name: file.name,
        };
      }),
    );

    setImages((images) => images.concat(newImages));
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Box
      alignItems="end"
      bottom={0}
      pb={2}
      position="sticky"
      px={2}
      sx={{ backgroundColor: (theme) => theme.palette.background.default }}
    >
      <Box alignItems="center" display="flex">
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
                onSubmit(message, docs, images);
                setMessage('');
                setDocs([]);
                setImages([]);
              }
            }
          }}
          onPaste={(event) => {
            const data = event.clipboardData;
            if (data.files.length > 0) {
              const files = Array.from(data.files);
              void uploadDocs(
                files.filter((file) => file.type in DocMimeTypeMapping),
              );
              void uploadImages(
                files.filter((file) => file.type in ImageMimeTypeMapping),
              );
            }
          }}
          placeholder="Ask a question"
          value={message}
        />
        <input
          accept=".csv,.doc,.docx,.jpg,.html,.md,.pdf,.png,.txt,.xls,.xlsx"
          multiple
          onChange={(data) => {
            if (!data.target.files) {
              return;
            }

            const files = Array.from(data.target.files);
            void uploadDocs(
              files.filter((file) => file.type in DocMimeTypeMapping),
            );
            void uploadImages(
              files.filter((file) => file.type in ImageMimeTypeMapping),
            );
          }}
          ref={fileInputRef}
          style={{ display: 'none' }}
          type="file"
        />
        <IconButton onClick={() => fileInputRef.current?.click()}>
          <CloudUpload />
        </IconButton>
        {loading ? (
          <CircularProgress sx={{ padding: 1 }} />
        ) : (
          <IconButton
            disabled={!message.trim()}
            onClick={() => {
              onSubmit(message, docs, images);
              setMessage('');
              setDocs([]);
              setImages([]);
            }}
          >
            <ArrowUpwardRounded />
          </IconButton>
        )}
      </Box>
      <Container maxWidth="md" sx={{ overflowX: 'auto', pt: 1 }}>
        <Stack direction="row" spacing={1}>
          {docs.map((doc) => (
            <Chip
              key={doc.id}
              label={doc.name}
              onDelete={() => {
                setDocs((docs) => docs.filter((doc2) => doc2.id !== doc.id));
              }}
            />
          ))}
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
    </Box>
  );
}
