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
import { ModelId, ModelMetadata } from '../types';
import { useThreadStore } from '../useThreadStore';

export default function LandingPage({
  onCreate,
}: {
  onCreate: (id: ThreadType['id']) => void;
}) {
  const createThread = useThreadStore((state) => state.createThread);
  const [model, setModel] = useState<ModelId>(ModelId.Claude3Haiku);

  const onSubmit = useCallback(
    (message: string, docs: FilePart[], images: ImagePart[]) => {
      const newMessage: TextPart & { id: string } = {
        id: uuid(),
        text: message,
        type: 'text',
      };
      const newId = createThread(
        {
          content: [newMessage, ...docs, ...images],
          id: uuid(),
          role: 'user',
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
            <InputLabel id="llm-model-label">LLM model</InputLabel>
            <Select
              label="LLM model"
              labelId="llm-model-label"
              onChange={({ target }) => {
                setModel(target.value as ModelId);
              }}
              value={model}
            >
              {Object.entries(ModelMetadata).map(
                ([modelId, { label: modelLabel }]) => (
                  <MenuItem key={modelId} value={modelId}>
                    {modelLabel}
                  </MenuItem>
                ),
              )}
            </Select>
          </FormControl>
        </Container>
      </Box>
      <Input modelId={model} onSubmit={onSubmit} />
    </Box>
  );
}
