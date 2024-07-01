import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Save from '@mui/icons-material/Save';
import Undo from '@mui/icons-material/Undo';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useState } from 'react';

import type { ThreadType } from '../useThreadStore';
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
      flexDirection="row"
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      <Button
        onClick={onClick}
        sx={{
          backgroundColor: (theme) =>
            thread.id === activeThread?.id
              ? prefersDarkMode
                ? theme.palette.grey[900]
                : theme.palette.grey[100]
              : undefined,
          color: (theme) => theme.palette.text.primary,
          flexGrow: 1,
          p: 1,
          textTransform: 'none',
          width: '100%',
        }}
      >
        {thread.name}
      </Button>
      {hovered && (
        <Box display="inline-flex" flexDirection="row">
          <IconButton
            onClick={() => {
              setEditing(true);
              setNewName(thread.name);
            }}
          >
            <Edit />
          </IconButton>
          <IconButton
            onClick={() => {
              deleteThread(thread.id);
            }}
          >
            <Delete />
          </IconButton>
        </Box>
      )}
    </Box>
  ) : (
    <Box display="flex">
      <TextField
        onChange={({ target }) => {
          setNewName(target.value);
        }}
        value={newName}
      />
      <IconButton
        onClick={() => {
          renameThread(thread.id, newName);
          setEditing(false);
        }}
      >
        <Save />
      </IconButton>
      <IconButton
        onClick={() => {
          setEditing(false);
        }}
      >
        <Undo />
      </IconButton>
    </Box>
  );
}
