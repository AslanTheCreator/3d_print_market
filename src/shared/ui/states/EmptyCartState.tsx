import React from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  useTheme,
  useMediaQuery,
  Button,
} from "@mui/material";
import { useRouter } from "next/navigation";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import SearchIcon from "@mui/icons-material/Search";

export const EmptyCartState: React.FC = () => {
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
        <ShoppingCartOutlinedIcon
          sx={{
            fontSize: isMobile ? 64 : 80,
            color: "text.disabled",
            opacity: 0.7,
          }}
        />

        <Stack spacing={2} alignItems="center">
          <Typography
            variant={isMobile ? "h6" : "h5"}
            fontWeight={700}
            color="text.primary"
          >
            Корзина пуста
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 400 }}
          >
            Воспользуйтесь поиском, чтобы найти всё, что нужно. Если в корзине
            были товары, войдите, чтобы посмотреть список.
          </Typography>
        </Stack>

        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={2}
          sx={{ width: isMobile ? "100%" : "auto" }}
        >
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={() => router.push("/")}
            size={isMobile ? "medium" : "large"}
            sx={{ minWidth: isMobile ? "100%" : 160, textTransform: "none" }}
          >
            Перейти к покупкам
          </Button>
        </Stack>
      </Box>
    </Container>
  );
};
