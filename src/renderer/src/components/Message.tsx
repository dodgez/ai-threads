import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import type { ChatMessage } from '../types/ChatMessage';
import { ChatMessageType } from '../types/ChatMessage';

export default function Message({ message }: { message: ChatMessage }) {
  return message.type === ChatMessageType.User ? (
    <Paper
      elevation={2}
      sx={{
        backgroundColor: 'aliceblue',
        marginLeft: 'auto !important',
        maxWidth: 'sm',
        p: 2,
      }}
    >
      <Typography>{message.message}</Typography>
    </Paper>
  ) : (
    <Box display="flex" flexDirection="row">
      <Paper
        elevation={2}
        sx={{
          p: 2,
        }}
      >
        <Typography>{message.message}</Typography>
      </Paper>
    </Box>
  );
}
