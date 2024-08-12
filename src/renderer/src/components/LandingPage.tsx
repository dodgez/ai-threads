import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import useTheme from '@mui/material/styles/useTheme';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { TextPart } from 'ai';
import { useCallback, useState } from 'react';
import { v4 as uuid } from 'uuid';

import Input from './Input';
import Suggestion from './Suggestion';
import type { FilePart, ImagePart, ThreadType } from '../types';
import { useThreadStore } from '../useThreadStore';

export default function LandingPage({
  onCreate,
}: {
  onCreate: (id: ThreadType['id']) => void;
}) {
  const createThread = useThreadStore((state) => state.createThread);
  const [model, setModel] = useState('anthropic.claude-3-haiku-20240307-v1:0');

  const onSubmit = useCallback(
    (message: string, docs: FilePart[], images: ImagePart[]) => {
      const newMessage: TextPart & { id: string } = {
        type: 'text',
        text: message,
        id: uuid(),
      };
      const newId = createThread(
        {
          role: 'user',
          content: [newMessage, ...docs, ...images],
          id: uuid(),
        },
        model,
      );
      onCreate(newId);
    },
    [createThread, model, onCreate],
  );

  const theme = useTheme();
  const mdMediaQuery = useMediaQuery(theme.breakpoints.up('md'));
  const lgMediaQuery = useMediaQuery(theme.breakpoints.up('lg'));

  return (
    <Box
      display="flex"
      flexDirection="column"
      flexGrow={1}
      height="100%"
      mx="auto"
    >
      <Box alignContent="center" flexGrow={1}>
        <Box display="flex" flexDirection="row" justifyContent="space-around">
          <Suggestion
            header="Programming"
            onClick={onSubmit}
            suggestion="Implement FizzBuzz in JavaScript."
          />
          {mdMediaQuery && (
            <Suggestion
              header="Science"
              onClick={onSubmit}
              suggestion="How many planets are in the Solar System?"
            />
          )}
          {lgMediaQuery && (
            <Suggestion
              header="Literature"
              onClick={onSubmit}
              suggestion="Write a Haiku about Rabbits."
            />
          )}
        </Box>
        <Container maxWidth="sm" sx={{ pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="bedrock-model-label">Bedrock model</InputLabel>
            <Select
              label="Bedrock model"
              labelId="bedrock-model-label"
              onChange={({ target }) => {
                setModel(target.value);
              }}
              value={model}
            >
              <MenuItem value="anthropic.claude-3-sonnet-20240229-v1:0">
                Anthropic Claude 3 Sonnet
              </MenuItem>
              <MenuItem value="anthropic.claude-3-haiku-20240307-v1:0">
                Anthropic Claude 3 Haiku
              </MenuItem>
              <MenuItem value="anthropic.claude-3-5-sonnet-20240620-v1:0">
                Anthropic Claude 3.5 Sonnet (no document support)
              </MenuItem>
            </Select>
          </FormControl>
        </Container>
      </Box>
      <Input onSubmit={onSubmit} />
    </Box>
  );
}
