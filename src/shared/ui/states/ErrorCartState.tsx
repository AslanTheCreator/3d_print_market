import React from "react";
import {
  Alert,
  Box,
  Container,
  Typography,
  Stack,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { ButtonStyled } from "@/shared/ui";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";

interface ErrorCartStateProps {
  onRetry?: () => void;
  error?: string;
}

export const ErrorCartState: React.FC<ErrorCartStateProps> = ({
  onRetry,
  error,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Container sx={{ marginTop: "10px" }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Корзина
      </Typography>

      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="400px"
        textAlign="center"
        gap={3}
      >
        <ErrorOutlineIcon
          sx={{
            fontSize: isMobile ? 64 : 80,
            color: "error.main",
            opacity: 0.7,
          }}
        />

        <Stack spacing={2} alignItems="center">
          <Typography
            variant={isMobile ? "h6" : "h5"}
            fontWeight={700}
            color="text.primary"
          >
            Не удалось загрузить корзину
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 400 }}
          >
            Произошла ошибка при загрузке содержимого корзины. Проверьте
            подключение к интернету и попробуйте еще раз.
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                mt: 1,
                maxWidth: 400,
                width: "100%",
                textAlign: "left",
              }}
            >
              {error}
            </Alert>
          )}
        </Stack>

        {onRetry && (
          <ButtonStyled
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            size={isMobile ? "medium" : "large"}
          >
            Попробовать снова
          </ButtonStyled>
        )}
      </Box>
    </Container>
  );
};
