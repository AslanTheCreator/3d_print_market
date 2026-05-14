import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import {
  CardGiftcardOutlined,
} from "@mui/icons-material";
import { siteLogo } from "@/shared/assets";

interface GiveawayMock {
  title: string;
  subtitle: string;
  imageSrc: StaticImageData;
  productUrl: string;
}

const giveawayMock: GiveawayMock = {
  title: "Розыгрыш фигурки недели",
  subtitle: "Участвуйте бесплатно и получите шанс забрать коллекционную фигурку.",
  imageSrc: siteLogo,
  productUrl: "/catalog/1/detail",
};

export const GiveawayCard = () => {
  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.18),
        borderRadius: { xs: 2, sm: 2.5 },
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: { xs: "1/1.05", sm: "2/1.08", lg: "2/1.12" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.14),
          borderBottom: "1px solid",
          borderColor: (theme) => alpha(theme.palette.secondary.main, 0.22),
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(239,66,132,0.08), rgba(84,197,229,0.14))",
          }}
        />

        <Image
          src={giveawayMock.imageSrc}
          alt={giveawayMock.title}
          width={180}
          height={180}
          priority
          style={{
            position: "relative",
            width: "72%",
            maxWidth: 210,
            height: "auto",
            objectFit: "contain",
          }}
        />
      </Box>

      <CardContent
        sx={{
          flex: 1,
          p: { xs: 1.5, sm: 1.75 },
          "&:last-child": { pb: { xs: 1.75, sm: 2 } },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Stack spacing={1.25}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Chip
              icon={<CardGiftcardOutlined sx={{ fontSize: 16 }} />}
              label="Розыгрыш"
              size="small"
              color="primary"
              sx={{
                height: 24,
                fontSize: "0.72rem",
                fontWeight: 700,
              }}
            />

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ whiteSpace: "nowrap" }}
            >
              Участие бесплатно
            </Typography>
          </Stack>

          <Stack spacing={0.75}>
            <Typography
              component="h2"
              variant="h6"
              sx={{
                fontWeight: 700,
                lineHeight: 1.3,
                color: "text.primary",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {giveawayMock.title}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                lineHeight: 1.55,
                display: "-webkit-box",
                WebkitLineClamp: { xs: 2, sm: 3 },
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {giveawayMock.subtitle}
            </Typography>
          </Stack>
        </Stack>

        <Button
          component={Link}
          href={giveawayMock.productUrl}
          variant="contained"
          color="primary"
          startIcon={<CardGiftcardOutlined />}
          fullWidth
          sx={{ minHeight: 44 }}
        >
          Участвовать
        </Button>
      </CardContent>
    </Card>
  );
};
