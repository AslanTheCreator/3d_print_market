import type { Metadata } from "next";
import { Box, Stack, Typography } from "@mui/material";
import { SITE_INFO } from "@/shared/config";
import { InfoPage } from "../_components/InfoPage";

export const metadata: Metadata = {
  title: "Контакты",
  description: `Контакты ${SITE_INFO.name} для пользователей и продавцов.`,
};

export default function ContactsPage() {
  return (
    <InfoPage
      title="Контакты"
      subtitle="Напишите нам, если нужен доступ к аккаунту, возник вопрос по работе сайта или нужно сообщить о проблеме с объявлением."
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
            Общие вопросы
          </Typography>
          <Typography
            component="a"
            href={`mailto:${SITE_INFO.email}`}
            variant="body1"
            color="primary.main"
            fontWeight={600}
          >
            {SITE_INFO.email}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Используйте этот адрес для вопросов по аккаунту, заказам и работе
            сайта.
          </Typography>
        </Box>

        <Box>
          <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
            Объявления и материалы
          </Typography>
          <Typography
            component="a"
            href={`mailto:${SITE_INFO.moderatorEmail}`}
            variant="body1"
            color="primary.main"
            fontWeight={600}
          >
            {SITE_INFO.moderatorEmail}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Сюда можно направить обращение по карточке товара, нарушению прав или
            некорректному содержанию.
          </Typography>
        </Box>

        <Box>
          <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
            Сайт
          </Typography>
          <Typography
            component="a"
            href={SITE_INFO.url}
            variant="body1"
            color="primary.main"
            fontWeight={600}
          >
            {SITE_INFO.url}
          </Typography>
        </Box>
      </Stack>
    </InfoPage>
  );
}
