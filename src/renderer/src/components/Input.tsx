import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import CloudUpload from '@mui/icons-material/CloudUpload';
import Stop from '@mui/icons-material/Stop';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { enqueueSnackbar } from 'notistack';
import type { ReactNode, RefObject } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

import Transcriber from './Transcriber';
import type { FilePart, ImagePart, ModelId } from '../types';
import {
  DocMimeTypeMapping,
  ImageMimeTypeMapping,
  ModelMetadata,
} from '../types';

export default function Input({
  inputRef,
  jumpButton = null,
  loading = false,
  modelId,
  onCancel,
  onSubmit,
  overrideCanSubmit = false,
}: {
  inputRef?: RefObject<HTMLInputElement>;
  jumpButton?: ReactNode;
  loading?: boolean;
  modelId: ModelId;
  onCancel?: () => void;
  onSubmit: (message: string, docs: FilePart[], images: ImagePart[]) => void;
  overrideCanSubmit?: boolean;
}) {
  const [message, setMessage] = useState('');
  const [docs, setDocs] = useState<FilePart[]>([]);
  const [images, setImages] = useState<ImagePart[]>([]);

  const uploadDocs = useCallback(async (files: File[]) => {
    const newDocs: (FilePart | undefined)[] = await Promise.all(
      files.map(async (file) => {
        const data: string | undefined = await new Promise((resolve) => {
          const reader = new FileReader();

          reader.onload = () => {
            resolve(reader.result as string);
          };

          reader.onerror = () => {
            enqueueSnackbar(`Error reading ${file.name}`, {
              autoHideDuration: 3000,
              variant: 'error',
            });
            resolve(undefined);
          };
          reader.readAsDataURL(file);
        });
        if (!data) return undefined;
        return {
          file: data,
          id: uuid(),
          mimeType: file.type,
          name: file.name.replace(/\.\w+$/, ''),
          type: 'file',
        };
      }),
    );
    const filteredDocs = newDocs.filter(
      (doc?: FilePart): doc is FilePart => !!doc,
    );

    setDocs((docs) => docs.concat(filteredDocs));
  }, []);
  const uploadImages = useCallback(async (files: File[]) => {
    const newImages: (ImagePart | undefined)[] = await Promise.all(
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
        return {
          format,
          id: uuid(),
          image: Buffer.from(buffer).toString('base64'),
          name: file.name,
          type: 'image',
        };
      }),
    );
    const filteredImages = newImages.filter(
      (img?: ImagePart): img is ImagePart => !!img,
    );

    setImages((images) => images.concat(filteredImages));
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onVoiceData = useCallback((transcript: string) => {
    setMessage((message) => message + transcript);
  }, []);

  const supportedFileTypes = useMemo(() => {
    const fileTypes = ['.jpg', '.png'];
    if (ModelMetadata[modelId].supportsDocs) {
      fileTypes.push(
        ...[
          '.csv',
          '.doc',
          '.docx',
          '.html',
          '.md',
          '.pdf',
          '.txt',
          '.xls',
          '.xlsx',
        ],
      );
    }
    return fileTypes;
  }, [modelId]);

  return (
    <Box alignItems="end" bottom={0} position="sticky">
      <Box display="flex" justifyContent="center">
        {jumpButton}
      </Box>
      <Box
        sx={{ backgroundColor: (theme) => theme.palette.background.default }}
      >
        <Divider />
        <Box
          alignItems="center"
          display="flex"
          pb={docs.length || images.length ? 1 : 2}
          pt={2}
        >
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
            accept={supportedFileTypes.join(',')}
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
            pb: docs.length || images.length ? 1 : 0,
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
