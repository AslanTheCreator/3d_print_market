"use client";

import {
  Box,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
} from "@mui/material";

export function ProductDetailsSkeleton() {
  return (
    <Box
      data-testid="product-details-skeleton"
      sx={{ pb: { xs: 24, sm: 0 } }}
    >
      <Container
        maxWidth="lg"
        disableGutters
        sx={{ px: { xs: 2, sm: 4 }, py: { xs: 0, sm: 3 } }}
      >
        <Box
          sx={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "7fr 5fr" },
            gridTemplateAreas: {
              xs: `
                "gallery"
                "title"
                "categories"
                "price"
                "seller"
                "description"
                "reviews"
                "related"
              `,
              sm: `
                "breadcrumbs"
                "title"
                "gallery"
                "categories"
                "price"
                "seller"
                "purchase"
                "favorite"
                "description"
                "reviews"
                "related"
              `,
              lg: `
                "breadcrumbs breadcrumbs"
                "title title"
                "gallery categories"
                "gallery price"
                "gallery seller"
                "gallery purchase"
                "gallery favorite"
                "gallery description"
                "reviews reviews"
                "related related"
              `,
            },
            columnGap: { lg: 3 },
            rowGap: { xs: 1.5, sm: 2.5 },
          }}
        >
          <Skeleton
            variant="text"
            width={240}
            height={24}
            sx={{
              gridArea: "breadcrumbs",
              display: { xs: "none", sm: "block" },
            }}
          />

          <Skeleton
            data-testid="product-details-skeleton-title"
            variant="text"
            width="70%"
            height={60}
            sx={{
              gridArea: "title",
              order: 0,
              maxHeight: { xs: 42, sm: 60 },
            }}
          />

          <Box
            data-testid="product-details-skeleton-gallery"
            sx={{
              gridArea: "gallery",
              mx: { xs: -2, sm: 0 },
              minWidth: 0,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                position: "relative",
                borderRadius: { xs: 2, sm: 2.5, md: 3 },
                overflow: "hidden",
                mb: { xs: 1.5, sm: 2, md: 2.5 },
              }}
            >
              <Skeleton
                variant="rectangular"
                width="100%"
                sx={{
                  aspectRatio: {
                    xs: "4/3",
                    sm: "16/10",
                    md: "3/2",
                  },
                }}
              />
            </Paper>
          </Box>

          <Skeleton
            variant="rounded"
            width={44}
            height={44}
            sx={{
              display: { xs: "block", sm: "none" },
              position: "absolute",
              top: 16,
              left: 0,
              zIndex: 2,
              borderRadius: 2.5,
            }}
          />

          <Stack
            direction="row"
            spacing={1}
            sx={{ gridArea: "categories", overflow: "hidden" }}
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                width={100}
                height={28}
                sx={{ borderRadius: 999, flexShrink: 0 }}
              />
            ))}
          </Stack>

          <Paper
            elevation={0}
            sx={{
              gridArea: "price",
              borderRadius: 2.5,
              p: { xs: 1.75, sm: 2.5 },
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack spacing={{ xs: 1.25, sm: 2 }}>
              <Box>
                <Skeleton variant="text" width="35%" height={18} />
                <Skeleton
                  variant="text"
                  width="58%"
                  sx={{
                    height: { xs: 28, sm: 34 },
                    mt: { xs: 0, sm: 0.5 },
                  }}
                />
              </Box>

              <Divider sx={{ display: { xs: "none", sm: "block" } }} />

              <Stack direction="row" spacing={1} alignItems="center">
                <Skeleton
                  variant="circular"
                  sx={{
                    width: { xs: 16, sm: 20 },
                    height: { xs: 16, sm: 20 },
                  }}
                />
                <Skeleton variant="text" width="42%" height={20} />
              </Stack>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              gridArea: "seller",
              borderRadius: 2.5,
              p: { xs: 1.5, sm: 1.75 },
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Skeleton
                variant="circular"
                sx={{
                  width: { xs: 40, sm: 44 },
                  height: { xs: 40, sm: 44 },
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="40%" height={24} />
                <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
                  <Skeleton
                    variant="rectangular"
                    width={68}
                    height={24}
                    sx={{ borderRadius: 999 }}
                  />
                  <Skeleton
                    variant="rectangular"
                    width={96}
                    height={24}
                    sx={{ borderRadius: 999 }}
                  />
                </Stack>
              </Box>
            </Stack>
          </Paper>

          <Paper
            data-testid="product-details-skeleton-purchase-action"
            elevation={2}
            sx={{
              gridArea: { xs: "unset", sm: "purchase" },
              position: { xs: "fixed", sm: "static" },
              inset: { xs: "auto 0 0", sm: "auto" },
              zIndex: { xs: 1000, sm: "auto" },
              borderRadius: { xs: "20px 20px 0 0", sm: 0 },
              p: { xs: "12px 16px", sm: 0 },
              boxShadow: {
                xs: "0 -8px 24px rgba(15, 23, 42, 0.10)",
                sm: "none",
              },
              bgcolor: { xs: "background.paper", sm: "transparent" },
              borderTop: { xs: "1px solid", sm: 0 },
              borderColor: "divider",
            }}
          >
            <Skeleton
              variant="text"
              width="42%"
              height={28}
              sx={{ display: { xs: "block", sm: "none" }, mb: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width="100%"
              height={48}
              sx={{ borderRadius: 1.5 }}
            />
          </Paper>

          <Skeleton
            variant="rectangular"
            width="100%"
            height={48}
            sx={{
              gridArea: { xs: "unset", sm: "favorite" },
              position: { xs: "absolute", sm: "static" },
              top: { xs: 16, sm: "auto" },
              right: { xs: 0, sm: "auto" },
              width: { xs: 44, sm: "100%" },
              height: { xs: 44, sm: 48 },
              borderRadius: { xs: 2.5, sm: 1.5 },
            }}
          />

          <Paper
            elevation={0}
            sx={{
              gridArea: "description",
              borderRadius: 2,
              p: { xs: 2, sm: 2.5 },
            }}
          >
            <Skeleton variant="text" width="30%" height={28} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="75%" />
          </Paper>

        </Box>
      </Container>
    </Box>
  );
}
