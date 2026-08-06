import { Box, Paper, Skeleton, Stack } from "@mui/material";
import type { ReactNode } from "react";
import { PageHeader } from "@/shared/ui/page-header";

interface OrdersLoadingSkeletonProps {
  icon: ReactNode;
  title: string;
}

const FILTER_WIDTHS = [132, 104, 118, 96] as const;
const SUMMARY_CARD_COUNT = 4;
const ORDER_CARD_COUNT = 2;

const OrderCardSkeleton = () => (
  <Paper
    variant="outlined"
    sx={{
      p: { xs: 1.5, sm: 2 },
      borderRadius: 2,
      bgcolor: "background.paper",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    }}
  >
    <Stack spacing={1.25}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
      >
        <Skeleton variant="rounded" width={124} height={28} />
        <Skeleton variant="text" width={92} height={20} />
      </Stack>

      <Stack direction="row" spacing={1.25} alignItems="center">
        <Skeleton
          variant="rounded"
          width={78}
          height={78}
          sx={{ flexShrink: 0 }}
        />
        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="84%" height={24} />
          <Skeleton variant="text" width="58%" height={20} />
          <Skeleton variant="text" width="42%" height={22} />
        </Stack>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 1,
        }}
      >
        {[0, 1].map((item) => (
          <Box
            key={item}
            sx={{ p: 1, borderRadius: 1.5, bgcolor: "grey.50" }}
          >
            <Skeleton variant="text" width="58%" height={18} />
            <Skeleton variant="text" width="76%" height={22} />
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          p: 1.25,
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Skeleton variant="text" width={96} height={18} sx={{ mb: 0.75 }} />
        <Stack direction="row" spacing={0.75} alignItems="center">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton
              key={item}
              variant="rounded"
              sx={{ flex: 1, minWidth: 0, height: 8 }}
            />
          ))}
        </Stack>
      </Box>

      <Stack spacing={0.75}>
        <Skeleton variant="rounded" width="100%" height={44} />
        <Skeleton variant="rounded" width="100%" height={44} />
      </Stack>
    </Stack>
  </Paper>
);

export const OrdersLoadingSkeleton = ({
  icon,
  title,
}: OrdersLoadingSkeletonProps) => (
  <Box
    role="status"
    aria-label={`Загрузка раздела «${title}»`}
    sx={{ width: "100%", py: { xs: 2, sm: 3 } }}
  >
    <PageHeader title={title} icon={icon} />

    <Stack spacing={{ xs: 2, sm: 3 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: { xs: 1, sm: 2 },
        }}
      >
        {Array.from({ length: SUMMARY_CARD_COUNT }).map((_, index) => (
          <Paper
            key={index}
            variant="outlined"
            sx={{
              p: { xs: 1.25, sm: 2 },
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 0.75, sm: 1.5 }}
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Skeleton
                variant="rounded"
                sx={{
                  width: { xs: 36, sm: 46 },
                  height: { xs: 36, sm: 46 },
                  borderRadius: { xs: 1.5, sm: "50%" },
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton variant="text" width="88%" height={20} />
                <Skeleton variant="text" width="42%" height={30} />
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
      >
        <Box
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "hidden",
            pb: 0.5,
            minWidth: 0,
            flexGrow: 1,
          }}
        >
          {FILTER_WIDTHS.map((width) => (
            <Skeleton
              key={width}
              variant="rounded"
              width={width}
              height={32}
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Box>
        <Skeleton
          variant="rounded"
          height={40}
          sx={{ width: { xs: "100%", sm: 220 }, flexShrink: 0 }}
        />
      </Stack>

      <Box>
        <Skeleton variant="text" width={164} height={34} sx={{ mb: 1.5 }} />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            gap: 1.5,
          }}
        >
          {Array.from({ length: ORDER_CARD_COUNT }).map((_, index) => (
            <OrderCardSkeleton key={index} />
          ))}
        </Box>
      </Box>
    </Stack>
  </Box>
);
