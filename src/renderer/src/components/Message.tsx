import Delete from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type {
  FilePart,
  ImagePart,
  TextPart,
  ToolCallPart,
  ToolResultPart,
} from 'ai';
import { useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import highlight from 'rehype-highlight';

import Synthesizer from './Synthesizer';
import type { MessageType, ThreadType } from '../types';
import { useThreadStore } from '../useThreadStore';

const { shell } =
  typeof window.require === 'function'
    ? window.require('electron')
    : {
        shell: {
          openExternal: (href: string) => window.open(href, '_blank'),
        },
      };

function Content({
  contentBlock,
}: {
  contentBlock: FilePart | ImagePart | TextPart | ToolCallPart | ToolResultPart;
}) {
  if (contentBlock.type === 'text') {
    return (
      <Typography sx={{ whiteSpace: 'pre-wrap' }}>
        {contentBlock.text}
      </Typography>
    );
  } else if (contentBlock.type === 'image') {
    return (
      <Chip
        color="info"
        label={(contentBlock as unknown as { name: string }).name}
      />
    );
  } else if (contentBlock.type === 'file') {
    return (
      <Chip
        color="info"
        label={(contentBlock as unknown as { name: string }).name}
      />
    );
  }

  return null;
}

export default function Message({
  message,
  thread,
}: {
  message: Omit<MessageType, 'id'> & { id?: MessageType['id'] };
  thread: ThreadType;
}) {
  const isFirst =
    thread.messages.findIndex((message2) => message2.id === message.id) === 0;
  const removeMessage = useThreadStore((state) => state.removeMessage);

  const onRemove = useCallback(() => {
    if (message.id) {
      removeMessage(thread.id, message.id);
    }
  }, [message.id, removeMessage, thread.id]);

  const [isHovered, setHovered] = useState(false);
  const messageText =
    typeof message.content === 'string'
      ? message.content
      : (message.content[0] as TextPart | undefined)?.text;

  const canHover = useMediaQuery('@media (hover: hover)');

  return message.role === 'user' ? (
    <Box
      alignItems="center"
      display="flex"
      maxWidth="md"
      ml="auto !important"
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      <IconButton
        onClick={onRemove}
        sx={{
          visibility:
            (isHovered || !canHover) && !isFirst ? 'visible' : 'hidden',
        }}
      >
        <Delete />
      </IconButton>
      <Paper
        elevation={2}
        sx={{
          backgroundColor: (theme) => theme.palette.primary.main,
          color: (theme) =>
            theme.palette.getContrastText(theme.palette.primary.main),
          overflow: 'auto',
          p: 2,
        }}
      >
        <Stack spacing={1}>
          {typeof message.content === 'string' ? (
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
          ) : (
            message.content.map((cb) => (
              <Content
                contentBlock={cb}
                key={(cb as unknown as { id: string }).id}
              />
            ))
          )}
        </Stack>
      </Paper>
    </Box>
  ) : (
    <Box
      alignItems="center"
      display="flex"
      maxWidth="md"
      mr="auto !important"
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      <Paper
        elevation={2}
        sx={{
          overflow: 'auto',
          p: 2,
        }}
      >
        <ReactMarkdown
          components={{
            a: ({ children, href }) => (
              <Link
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  void shell.openExternal(href ?? '');
                }}
              >
                {children}
              </Link>
            ),
          }}
          rehypePlugins={[highlight]}
        >
          {messageText ?? ''}
        </ReactMarkdown>
      </Paper>
      <Box
        sx={{
          visibility:
            (isHovered || !canHover) && message.id ? 'visible' : 'hidden',
        }}
      >
        {messageText && <Synthesizer text={messageText} />}
        <IconButton onClick={onRemove}>
          <Delete />
        </IconButton>
      </Box>
    </Box>
  );
}
