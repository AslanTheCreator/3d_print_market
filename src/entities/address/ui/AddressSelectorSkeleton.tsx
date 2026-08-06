import {
  Card,
  CardContent,
  FormControl,
  Skeleton,
  Stack,
} from "@mui/material";

interface AddressSelectorSkeletonProps {
  count?: number;
  showRadio?: boolean;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  showAddButton?: boolean;
}

export const AddressSelectorSkeleton = ({
  count = 3,
  showRadio = true,
  showEditButton = false,
  showDeleteButton = false,
  showAddButton = false,
}: AddressSelectorSkeletonProps) => (
  <FormControl component="fieldset" fullWidth aria-busy="true">
    {showRadio && (
      <Skeleton variant="text" width={220} height={28} sx={{ mb: 2 }} />
    )}

    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} variant="outlined" sx={{ borderWidth: 2 }}>
          <CardContent
            sx={{
              p: { xs: 2, sm: 2.5 },
              "&:last-child": { pb: { xs: 2, sm: 2.5 } },
            }}
          >
            <Stack direction="row" spacing={2} alignItems="flex-start">
              {showRadio ? (
                <Skeleton variant="circular" width={24} height={24} />
              ) : (
                <Skeleton
                  variant="rounded"
                  width={40}
                  height={40}
                  sx={{ display: { xs: "none", sm: "block" } }}
                />
              )}

              <Stack spacing={0.5} sx={{ flex: 1 }}>
                <Skeleton variant="text" width="72%" height={24} />
                <Skeleton variant="text" width="46%" height={20} />
                <Skeleton variant="rounded" width={104} height={24} />
              </Stack>

              {(showEditButton || showDeleteButton) && (
                <Stack direction="row" spacing={0.5}>
                  {showEditButton && (
                    <Skeleton variant="circular" width={34} height={34} />
                  )}
                  {showDeleteButton && (
                    <Skeleton variant="circular" width={34} height={34} />
                  )}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>

    {showAddButton && (
      <Skeleton
        variant="rounded"
        height={42}
        sx={{ mt: 3, width: { xs: "100%", sm: 220 } }}
      />
    )}
  </FormControl>
);
