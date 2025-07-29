import React from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { ButtonStyled } from "@/shared/ui";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";

export const UnauthorizedCartState: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Container sx={{ marginTop: "10px" }}>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="400px"
        textAlign="center"
        gap={3}
      >
        <LockOutlinedIcon
          sx={{
            fontSize: isMobile ? 64 : 80,
            color: "primary.main",
            opacity: 0.7,
          }}
        />

        <Stack spacing={2} alignItems="center">
          <Typography
            variant={isMobile ? "h6" : "h5"}
            fontWeight={700}
            color="text.primary"
          >
            Войдите в аккаунт
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 400 }}
          >
            Чтобы добавлять товары в корзину и оформлять заказы, необходимо
            войти в свой аккаунт или зарегистрироваться.
          </Typography>
        </Stack>

        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={2}
          sx={{ width: isMobile ? "100%" : "auto" }}
        >
          <ButtonStyled
            variant="contained"
            startIcon={<LoginIcon />}
            onClick={() => router.push("/login")}
            size={isMobile ? "medium" : "large"}
            sx={{ minWidth: isMobile ? "100%" : 140 }}
          >
            Войти
          </ButtonStyled>

          <ButtonStyled
            variant="outlined"
            startIcon={<PersonAddOutlinedIcon />}
            onClick={() => router.push("/register")}
            size={isMobile ? "medium" : "large"}
            sx={{ minWidth: isMobile ? "100%" : 160 }}
          >
            Регистрация
          </ButtonStyled>
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            mt: 2,
            maxWidth: 300,
            lineHeight: 1.5,
          }}
        >
          У вас уже есть товары в корзине? После входа в аккаунт они
          автоматически восстановятся.
        </Typography>
      </Box>
    </Container>
  );
};
