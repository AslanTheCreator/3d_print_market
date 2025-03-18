import { Container, Typography, Button } from "@mui/material";

interface EmptyStateProps {
  message: string;
  buttonText: string;
  onButtonClick: () => void;
}

export const LoadingState = () => {
  return (
    <Container sx={{ my: 4, textAlign: "center" }}>
      <Typography>Загрузка данных корзины...</Typography>
    </Container>
  );
};

export const EmptyState = ({
  message,
  buttonText,
  onButtonClick,
}: EmptyStateProps) => {
  return (
    <Container sx={{ my: 4, textAlign: "center" }}>
      <Typography variant="h5" gutterBottom>
        {message}
      </Typography>
      <Button variant="contained" onClick={onButtonClick}>
        {buttonText}
      </Button>
    </Container>
  );
};
