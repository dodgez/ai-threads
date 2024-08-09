import type {
  DocumentBlock,
  ImageBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { DocumentFormat, ImageFormat } from '@aws-sdk/client-bedrock-runtime';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import CloudUpload from '@mui/icons-material/CloudUpload';
import Stop from '@mui/icons-material/Stop';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { enqueueSnackbar } from 'notistack';
import type { ReactNode, RefObject } from 'react';
import { useCallback, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

import Transcriber from './Transcriber';

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

type DocType = DocumentBlock & { id: string; name: string };
type ImageType = ImageBlock & { id: string; name: string };

export default function Input({
  inputRef,
  jumpButton = null,
  loading = false,
  onCancel,
  onSubmit,
  overrideCanSubmit = false,
}: {
  inputRef?: RefObject<HTMLInputElement>;
  jumpButton?: ReactNode;
  loading?: boolean;
  onCancel?: () => void;
  onSubmit: (
    message: string,
    docs: DocumentBlock[],
    images: ImageBlock[],
  ) => void;
  overrideCanSubmit?: boolean;
}) {
  const [message, setMessage] = useState('');
  const [docs, setDocs] = useState<(DocumentBlock & { id: string })[]>([]);
  const [images, setImages] = useState<
    (ImageBlock & { id: string; name: string })[]
  >([]);

  const uploadDocs = useCallback(async (files: File[]) => {
    const newDocs: (DocType | undefined)[] = await Promise.all(
      files.map(async (file) => {
        const format = DocMimeTypeMapping[file.type];
        const buffer = await file.arrayBuffer().catch((e: unknown) => {
          enqueueSnackbar(
            `Error uploading ${file.name}: ${JSON.stringify(e)}`,
            {
              autoHideDuration: 3000,
              variant: 'error',
            },
          );
        });
        if (!buffer) return undefined;
        const bytes = new Uint8Array(buffer);
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
    const filteredDocs = newDocs.filter(
      (doc?: DocType): doc is DocType => !!doc,
    );

    setDocs((docs) => docs.concat(filteredDocs));
  }, []);
  const uploadImages = useCallback(async (files: File[]) => {
    const newImages: (ImageType | undefined)[] = await Promise.all(
      files.map(async (file) => {
        const format = ImageMimeTypeMapping[file.type];
        const buffer = await file.arrayBuffer().catch((e: unknown) => {
          enqueueSnackbar(
            `Error uploading ${file.name}: ${JSON.stringify(e)}`,
            {
              autoHideDuration: 3000,
              variant: 'error',
            },
          );
        });
        if (!buffer) return undefined;
        const bytes = new Uint8Array(buffer);
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
    const filteredImages = newImages.filter(
      (img?: ImageType): img is ImageType => !!img,
    );

    setImages((images) => images.concat(filteredImages));
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onVoiceData = useCallback((transcript: string) => {
    setMessage((message) => message + transcript);
  }, []);

  return (
    <Box alignItems="end" bottom={0} position="sticky">
      <Box display="flex" justifyContent="center">
        {jumpButton}
      </Box>
      <Box
        pb={2}
        px={2}
        sx={{ backgroundColor: (theme) => theme.palette.background.default }}
      >
        <Box alignItems="center" display="flex">
          <Transcriber onVoiceData={onVoiceData} />
          <TextField
            autoFocus
            disabled={loading}
            fullWidth
            inputRef={inputRef}
            maxRows={5}
            multiline
            onChange={({ target }) => {
              setMessage(target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (overrideCanSubmit || message.trim()) {
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
            onCancel ? (
              <IconButton onClick={onCancel}>
                <Stop />
              </IconButton>
            ) : (
              <CircularProgress sx={{ padding: 1 }} />
            )
          ) : (
            <IconButton
              disabled={!message.trim() && !overrideCanSubmit}
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
        <Container
          maxWidth="md"
          sx={{
            backgroundColor: (theme) => theme.palette.background.default,
            overflowX: 'auto',
            pt: 1,
          }}
        >
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
    </Box>
  );
}
