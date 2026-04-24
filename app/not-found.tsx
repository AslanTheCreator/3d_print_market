import Link from "next/link";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";

export default function NotFound() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            width: { xs: 96, sm: 112 },
            height: { xs: 96, sm: 112 },
            borderRadius: "50%",
            bgcolor: "rgba(239, 66, 132, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 3,
          }}
        >
          <SearchOffOutlinedIcon
            sx={{ fontSize: { xs: 44, sm: 52 }, color: "primary.main" }}
          />
        </Box>

        <Stack spacing={1.5} alignItems="center">
          <Typography variant="h4" fontWeight={700}>
            Страница не найдена
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 420, lineHeight: 1.6 }}
          >
            Возможно, ссылка устарела, страница была перемещена или такого
            адреса больше не существует.
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mt: 4, width: { xs: "100%", sm: "auto" } }}
        >
          <Button
            component={Link}
            href="/"
            variant="contained"
            size="large"
            sx={{ minWidth: { xs: "100%", sm: 200 }, textTransform: "none" }}
          >
            На главную
          </Button>
          <Button
            component={Link}
            href="/catalog/search"
            variant="outlined"
            size="large"
            sx={{ minWidth: { xs: "100%", sm: 200 }, textTransform: "none" }}
          >
            Перейти к поиску
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
