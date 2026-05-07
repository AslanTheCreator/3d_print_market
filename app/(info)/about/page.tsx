import type { Metadata } from "next";
import Link from "next/link";
import { Box, Button, Stack, Typography } from "@mui/material";
import { SITE_INFO, SITE_ROUTES } from "@/shared/config";
import { InfoPage } from "../_components/InfoPage";

export const metadata: Metadata = {
  title: "О нас",
  description: `${SITE_INFO.name} — маркетплейс коллекционных фигурок и товаров для 3D-печати.`,
};

const features = [
  "покупать готовые фигурки, аксессуары и изделия 3D-печати",
  "размещать собственные товары и управлять заказами в личном кабинете",
  "сохранять интересные позиции в избранное и быстро возвращаться к ним",
  "обсуждать детали заказа, оплату и доставку между покупателем и продавцом",
] as const;

export default function AboutPage() {
  return (
    <InfoPage
      title="О нас"
      subtitle={`${SITE_INFO.name} помогает находить и продавать коллекционные фигурки, авторские изделия и товары для 3D-печати.`}
    >
      <Stack spacing={3}>
        <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
          Мы развиваем площадку для коллекционеров, мастеров и продавцов, которым
          нужен понятный каталог, личный кабинет и инструменты для работы с
          заказами. На сайте можно искать товары, сравнивать предложения,
          оформлять покупки и размещать собственные позиции.
        </Typography>

        <Box>
          <Typography variant="h5" component="h2" sx={{ mb: 1.5 }}>
            Что можно делать на сайте
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {features.map((feature) => (
              <Typography
                key={feature}
                component="li"
                variant="body1"
                sx={{ mb: 1, lineHeight: 1.7 }}
              >
                {feature}
              </Typography>
            ))}
          </Box>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button component={Link} href="/catalog/search" variant="contained">
            Перейти в каталог
          </Button>
          <Button component={Link} href={SITE_ROUTES.contacts} variant="outlined">
            Связаться с нами
          </Button>
        </Stack>
      </Stack>
    </InfoPage>
  );
}
