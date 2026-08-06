import { Skeleton, Stack } from "@mui/material";

export const SettingsPanelSkeleton = () => (
  <Stack spacing={2} aria-busy="true">
    <Skeleton variant="text" width="32%" height={30} />
    <Skeleton variant="rectangular" height={1} />
    {[1, 2, 3].map((item) => (
      <Skeleton key={item} variant="rounded" height={56} />
    ))}
    <Skeleton
      variant="rounded"
      height={42}
      sx={{ width: { xs: "100%", sm: 200 } }}
    />
  </Stack>
);
