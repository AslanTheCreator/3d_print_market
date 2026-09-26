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
import { CardGiftcardOutlined } from "@mui/icons-material";
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
        display: { xs: "grid", sm: "flex" },
        flexDirection: "column",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        // Учитываем промежуток сетки, padding ячеек на xs и границы карточек.
        columnGap: (theme) => ({
          xs: `calc(${theme.spacing(2)} + 2px)`,
          sm: 0,
        }),
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
          alignSelf: { xs: "start", sm: "auto" },
          aspectRatio: { xs: "1/1.2", sm: "2/1.08", lg: "2/1.12" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.14),
          borderBottomWidth: { xs: 0, sm: 1 },
          borderBottomStyle: "solid",
          borderColor: (theme) => alpha(theme.palette.secondary.main, 0.22),
          overflow: "hidden",
          "& > img": {
            position: { xs: "absolute", sm: "relative" },
            inset: { xs: 0, sm: "auto" },
            width: { xs: "100%", sm: "72%" },
            maxWidth: { xs: "none", sm: 210 },
            height: { xs: "100%", sm: "auto" },
            objectFit: { xs: "cover", sm: "contain" },
          },
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
        />
      </Box>

      <CardContent
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 1.25, sm: 1.75 },
          "&:last-child": { pb: { xs: 1.5, sm: 2 } },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: { xs: 1, sm: 1.5 },
        }}
      >
        <Stack spacing={1.25} useFlexGap>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ display: { xs: "none", sm: "flex" } }}
          >
            <Chip
              icon={<CardGiftcardOutlined sx={{ fontSize: 16 }} />}
              label="Розыгрыш"
              size="small"
              color="primary"
              sx={{ height: 24, fontSize: "0.72rem", fontWeight: 700 }}
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
                display: { xs: "block", sm: "-webkit-box" },
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {giveawayMock.title}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: "block", sm: "none" } }}
            >
              Участие бесплатно
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                lineHeight: 1.55,
                display: { xs: "none", sm: "-webkit-box" },
                WebkitLineClamp: 3,
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
          style={{ color: "#fff" }}
          sx={{
            minHeight: 44,
            minWidth: { xs: 0, sm: 64 },
            py: { xs: 0.75, sm: 1 },
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            fontWeight: 600,
            borderRadius: { xs: 1, sm: "8px" },
            color: "common.white",
            "& .MuiButton-startIcon": {
              display: { xs: "none", sm: "inline-flex" },
              color: "inherit",
            },
            "& .MuiSvgIcon-root": {
              color: "inherit",
            },
          }}
        >
          Участвовать
        </Button>
      </CardContent>
    </Card>
  );
};
