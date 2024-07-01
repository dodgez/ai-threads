import type { ContentBlock, ImageBlock } from '@aws-sdk/client-bedrock-runtime';
import { ConversationRole } from '@aws-sdk/client-bedrock-runtime';
import Delete from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import type { MessageType, ThreadType } from '../useThreadStore';
import { useThreadStore } from '../useThreadStore';

function Content({ contentBlock }: { contentBlock: ContentBlock }) {
  if (contentBlock.text) {
    return <Typography>{contentBlock.text}</Typography>;
  } else if (contentBlock.document) {
    return <Chip color="info" label={contentBlock.document.name} />;
  } else if (contentBlock.image) {
    const image = contentBlock.image as ImageBlock & { name: string };
    return <Chip color="info" label={image.name} />;
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

  return message.role === ConversationRole.USER ? (
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
        sx={{ visibility: isHovered && !isFirst ? 'visible' : 'hidden' }}
      >
        <Delete />
      </IconButton>
      <Paper
        elevation={2}
        sx={{
          backgroundColor: (theme) => theme.palette.primary.main,
          color: (theme) =>
            theme.palette.getContrastText(theme.palette.primary.main),
          p: 2,
        }}
      >
        <Stack spacing={1}>
          {message.content?.map((cb) => (
            <Content
              contentBlock={cb}
              key={(cb as ContentBlock & { id: string }).id}
            />
          ))}
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
          p: 2,
        }}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
        <ReactMarkdown>{message.content![0].text!}</ReactMarkdown>
      </Paper>
      <IconButton
        onClick={onRemove}
        sx={{ visibility: isHovered && message.id ? 'visible' : 'hidden' }}
      >
        <Delete />
      </IconButton>
    </Box>
  );
}
