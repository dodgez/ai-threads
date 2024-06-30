import type {
  Message as BedrockMessage,
  ContentBlock,
  ImageBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationRole } from '@aws-sdk/client-bedrock-runtime';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ReactMarkdown from 'react-markdown';

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

export default function Message({ message }: { message: BedrockMessage }) {
  return message.role === ConversationRole.USER ? (
    <Paper
      elevation={2}
      sx={{
        backgroundColor: (theme) => theme.palette.primary.main,
        color: (theme) =>
          theme.palette.getContrastText(theme.palette.primary.main),
        marginLeft: 'auto !important',
        maxWidth: 'md',
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
  ) : (
    <Box display="flex" flexDirection="row">
      <Paper
        elevation={2}
        sx={{
          maxWidth: 'md',
          p: 2,
        }}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
        <ReactMarkdown>{message.content![0].text!}</ReactMarkdown>
      </Paper>
    </Box>
  );
}
