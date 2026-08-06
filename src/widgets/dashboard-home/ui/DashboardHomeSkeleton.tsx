import {
  Box,
  Card,
  CardContent,
  Divider,
  Skeleton,
  Stack,
} from "@mui/material";

const SHORTCUT_CARD_COUNT = 3;

export const DashboardHomeSkeleton = () => (
  <Box role="status" aria-label="Загрузка обзора профиля">
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{ display: { xs: "none", md: "flex" }, mb: 3 }}
    >
      <Skeleton variant="rounded" width={42} height={42} />
      <Skeleton variant="text" width={132} height={38} />
    </Stack>

    <Card
      sx={{
        mb: { xs: 1.25, sm: 2 },
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={{ xs: 1.5, sm: 3, lg: 4 }}
          divider={
            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: "none", lg: "block" } }}
            />
          }
        >
          <Stack
            direction="row"
            spacing={{ xs: 1.25, sm: 2.5 }}
            alignItems="center"
            sx={{ flex: "1 1 42%", minWidth: 0 }}
          >
            <Skeleton
              variant="circular"
              sx={{
                width: { xs: 60, sm: 118 },
                height: { xs: 60, sm: 118 },
                flexShrink: 0,
              }}
            />
            <Stack spacing={{ xs: 0.5, sm: 1 }} sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="72%" height={36} />
              <Skeleton
                variant="text"
                width="48%"
                height={22}
                sx={{ display: { xs: "none", sm: "block" } }}
              />
              <Skeleton variant="text" width="38%" height={24} />
            </Stack>
          </Stack>

          <Box
            sx={{
              flex: "1 1 32%",
              minWidth: 0,
              p: { xs: 1.25, sm: 0 },
              borderRadius: { xs: 1.5, sm: 0 },
              border: { xs: "1px solid", sm: "none" },
              borderColor: "divider",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              spacing={2}
              sx={{ mb: 1 }}
            >
              <Skeleton variant="text" width={136} height={22} />
              <Skeleton variant="text" width={42} height={22} />
            </Stack>
            <Skeleton
              variant="rounded"
              width="100%"
              sx={{ height: { xs: 6, sm: 7 }, mb: { xs: 1.25, sm: 2 } }}
            />
            <Stack spacing={{ xs: 0.75, sm: 1 }}>
              {[0, 1, 2].map((item) => (
                <Stack key={item} direction="row" spacing={1} alignItems="center">
                  <Skeleton variant="circular" width={20} height={20} />
                  <Skeleton
                    variant="text"
                    width={`${72 - item * 10}%`}
                    height={20}
                  />
                </Stack>
              ))}
            </Stack>
          </Box>

          <Skeleton
            variant="rounded"
            height={46}
            sx={{
              width: { xs: "100%", lg: 260 },
              alignSelf: { lg: "center" },
              flexShrink: 0,
            }}
          />
        </Stack>
      </CardContent>
    </Card>

    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(3, minmax(0, 1fr))",
        },
        gap: { xs: 1, sm: 2 },
      }}
    >
      {Array.from({ length: SHORTCUT_CARD_COUNT }).map((_, index) => (
        <Card
          key={index}
          sx={{
            height: "100%",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
          }}
        >
          <CardContent
            sx={{
              p: { xs: 1.5, sm: 2, md: 2.5 },
              minHeight: { xs: 136, sm: 148, md: 132 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Skeleton
              variant="rounded"
              sx={{
                width: { xs: 44, sm: 48 },
                height: { xs: 44, sm: 48 },
                borderRadius: 2,
              }}
            />
            <Box>
              <Skeleton variant="text" width="78%" height={28} />
              <Skeleton variant="text" width="54%" height={22} />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  </Box>
);
