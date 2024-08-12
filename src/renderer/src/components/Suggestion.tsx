import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import type { FilePart, ImagePart } from '../types';

export default function Suggestion({
  header,
  onClick,
  suggestion,
}: {
  header: string;
  onClick: (message: string, docs: FilePart[], images: ImagePart[]) => void;
  suggestion: string;
}) {
  return (
    <Card
      onClick={() => {
        onClick(suggestion, [], []);
      }}
      sx={{ cursor: 'pointer', maxWidth: '200px' }}
    >
      <CardHeader title={header} />
      <CardContent sx={{ height: 'fit-content' }}>
        <Typography>{suggestion}</Typography>
      </CardContent>
    </Card>
  );
}
