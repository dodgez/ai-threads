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

import type { ThreadType } from '../ThreadProvider';
import { useThreads } from '../ThreadProvider';

export default function ThreadButton({ thread }: { thread: ThreadType }) {
  const { setThreads, deleteThread, activeThread, setActiveThread } =
    useThreads();
  const [hovered, setHovered] = useState(false);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(thread.name);

  return !editing ? (
    <Box
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      <Button
        onClick={() => {
          setActiveThread(thread.id);
        }}
        sx={{
          backgroundColor: (theme) =>
            thread.id === activeThread
              ? prefersDarkMode
                ? theme.palette.grey[900]
                : theme.palette.grey[100]
              : undefined,
          color: (theme) => theme.palette.text.primary,
          p: 1,
          width: '100%',
        }}
      >
        {thread.name}
      </Button>
      {hovered && (
        <Box
          display="inline-flex"
          flexDirection="row"
          position="absolute"
          right={24}
        >
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
          setThreads((threads) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const updatedThread = threads.find(
              (thread2) => thread2.id === thread.id,
            )!;
            updatedThread.name = newName;
            return [...threads];
          });
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
