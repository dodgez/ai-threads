import type { Message as BedrockMessage } from '@aws-sdk/client-bedrock-runtime';
import { ConversationRole } from '@aws-sdk/client-bedrock-runtime';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ReactMarkdown from 'react-markdown';

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
      {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
      <Typography>{message.content![0].text!}</Typography>
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
