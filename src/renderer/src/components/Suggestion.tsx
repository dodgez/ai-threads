import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

export default function Suggestion({
  header,
  suggestion,
}: {
  header: string;
  suggestion: string;
}) {
  return (
    <Card sx={{ maxWidth: '200px' }}>
      <CardHeader title={header} />
      <CardContent sx={{ height: 'fit-content' }}>
        <Typography>{suggestion}</Typography>
      </CardContent>
    </Card>
  );
}
