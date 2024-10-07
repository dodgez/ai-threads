import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Save from '@mui/icons-material/Save';
import Undo from '@mui/icons-material/Undo';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import numeral from 'numeral';
import { useState } from 'react';

import type { ThreadType } from '../types';
import { ModelMetadata } from '../types';
import { useThreadStore } from '../useThreadStore';

export default function ThreadButton({
  activeThread,
  onClick,
  thread,
}: {
  activeThread?: ThreadType;
  onClick: () => void;
  thread: ThreadType;
}) {
  const renameThread = useThreadStore((state) => state.renameThread);
  const deleteThread = useThreadStore((state) => state.deleteThread);
  const [hovered, setHovered] = useState(false);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(thread.name);

  return !editing ? (
    <Box
      display="flex"
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      <Box
        sx={{
          alignItems: 'flex-start',
          backgroundColor: (theme) =>
            thread.id === activeThread?.id
              ? prefersDarkMode
                ? theme.palette.grey[900]
                : theme.palette.grey[100]
              : undefined,
          color: (theme) => theme.palette.text.primary,
          flexGrow: 1,
          width: '100%',
        }}
      >
        <Box display="flex" flexDirection="row" flexGrow={1}>
          <Button
            onClick={onClick}
            sx={{
              alignItems: 'start',
              color: (theme) => theme.palette.text.primary,
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              textAlign: 'left',
              textTransform: 'none',
            }}
          >
            <Typography variant="body1">{thread.name}</Typography>
            <Typography
              sx={{
                color: (theme) => theme.palette.text.secondary,
                fontSize: '0.875rem',
              }}
              variant="body2"
            >
              {`${ModelMetadata[thread.model].label} - ${numeral(thread.tokens).format('0.[00]a')} tokens`}
            </Typography>
          </Button>
          <Paper
            sx={{
              backgroundColor: (theme) => theme.palette.background.default,
              display: 'inline-flex',
              flexDirection: 'column',
              justifyContent: 'space-evenly',
              visibility: hovered ? 'visible' : 'hidden',
            }}
          >
            <IconButton
              onClick={() => {
                setEditing(true);
                setNewName(thread.name);
              }}
              size="small"
            >
              <Edit />
            </IconButton>
            <Divider />
            <IconButton
              onClick={() => {
                deleteThread(thread.id);
              }}
              size="small"
            >
              <Delete />
            </IconButton>
          </Paper>
        </Box>
      </Box>
    </Box>
  ) : (
    <Box alignItems="center" display="flex">
      <TextField
        onChange={({ target }) => {
          setNewName(target.value);
        }}
        sx={{ flexGrow: 1 }}
        value={newName}
      />
      <Box display="flex" flexDirection="column">
        <IconButton
          onClick={() => {
            setEditing(false);
          }}
          size="small"
        >
          <Undo />
        </IconButton>
        <IconButton
          onClick={() => {
            renameThread(thread.id, newName);
            setEditing(false);
          }}
          size="small"
        >
          <Save />
        </IconButton>
      </Box>
    </Box>
  );
}
