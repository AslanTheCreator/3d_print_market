import Link from "next/link";
import { Box, Typography, Container, Stack } from "@mui/material";
import { SITE_INFO, SITE_ROUTES } from "@/shared/config";

const footerColumns = [
  {
    title: "Покупателям",
    links: [
      { label: "Каталог", href: "/catalog/search" },
      { label: "Избранное", href: "/favorites" },
      { label: "Корзина", href: "/checkout" },
    ],
  },
  {
    title: "Продавцам",
    links: [
      { label: "Разместить товар", href: "/dashboard/products/new" },
      { label: "Мои товары", href: "/dashboard/products" },
      { label: "Продажи", href: "/dashboard/sales" },
    ],
  },
  {
    title: "Компания",
    links: [
      { label: "О нас", href: SITE_ROUTES.about },
      { label: "Контакты", href: SITE_ROUTES.contacts },
    ],
  },
  {
    title: "Документы",
    links: [
      { label: "Пользовательское соглашение", href: SITE_ROUTES.userAgreement },
      { label: "Конфиденциальность", href: SITE_ROUTES.privacy },
    ],
  },
] as const;

export const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        mt: { xs: 5, sm: 7 },
        bgcolor: "rgba(122, 212, 238, 0.12)",
        borderTop: "1px solid rgba(84, 197, 229, 0.28)",
      }}
    >
      <Container>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
            },
            gap: { xs: 3, sm: 4, md: 6 },
            py: { xs: 4, sm: 5 },
          }}
        >
          {footerColumns.map((column) => (
            <Stack key={column.title} spacing={1.25}>
              <Typography variant="subtitle1" fontWeight={700}>
                {column.title}
              </Typography>
              <Stack spacing={1}>
                {column.links.map((link) => (
                  <Typography
                    key={link.href}
                    component={Link}
                    href={link.href}
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      width: "fit-content",
                      transition: "color 0.2s ease",
                      "&:hover": {
                        color: "primary.main",
                      },
                    }}
                  >
                    {link.label}
                  </Typography>
                ))}
              </Stack>
            </Stack>
          ))}
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1}
          sx={{
            py: 2.5,
            borderTop: "1px solid rgba(33, 33, 33, 0.08)",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © 2026 {SITE_INFO.name}. Все права защищены.
          </Typography>
          <Typography
            component="a"
            href={`mailto:${SITE_INFO.email}`}
            variant="body2"
            color="text.secondary"
            sx={{
              transition: "color 0.2s ease",
              "&:hover": {
                color: "primary.main",
              },
            }}
          >
            {SITE_INFO.email}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};
