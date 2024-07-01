import type {
  DocumentBlock,
  ImageBlock,
} from '@aws-sdk/client-bedrock-runtime';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

export default function Suggestion({
  header,
  onClick,
  suggestion,
}: {
  header: string;
  onClick: (
    message: string,
    docs: DocumentBlock[],
    images: ImageBlock[],
  ) => void;
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
