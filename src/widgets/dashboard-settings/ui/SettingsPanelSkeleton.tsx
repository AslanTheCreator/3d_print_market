import { Skeleton, Stack } from "@mui/material";

export const SettingsPanelSkeleton = () => (
  <Stack spacing={2} aria-busy="true">
    <Skeleton variant="text" width="80%" height={30} />
    <Skeleton variant="rectangular" height={1} />
    {[1, 2, 3].map((item) => (
      <Skeleton key={item} variant="rounded" sx={{ height: { xs: 92, md: 56 } }} />
    ))}
    <Skeleton
      variant="rounded"
      height={42}
      sx={{ display: { xs: "none", md: "block" }, width: 200 }}
    />
  </Stack>
);
