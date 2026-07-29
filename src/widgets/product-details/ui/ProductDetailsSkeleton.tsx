"use client";

import {
  Box,
  Container,
  Paper,
  Skeleton,
  Stack,
} from "@mui/material";

export function ProductDetailsSkeleton() {
  return (
    <Box sx={{ pb: { xs: 24, sm: 0 } }}>
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
            sx={{
              gridArea: "gallery",
              mx: { xs: -2, sm: 0 },
              minWidth: 0,
            }}
          >
            <Skeleton
              variant="rectangular"
              width="100%"
              sx={{
                height: { xs: 280, sm: 400 },
                borderRadius: { xs: 0, sm: 3 },
              }}
            />
            <Paper
              elevation={0}
              sx={{
                mt: { xs: 1.5, sm: 2 },
                p: { xs: 2, sm: 2.5, md: 3 },
                borderRadius: { xs: 0, sm: 2.5, md: 3 },
              }}
            >
              <Stack
                direction="row"
                spacing={{ xs: 1, sm: 1.5, md: 2 }}
                sx={{ overflow: "hidden" }}
              >
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    variant="rectangular"
                    sx={{
                      width: { xs: 60, sm: 80, md: 100 },
                      height: { xs: 60, sm: 80, md: 100 },
                      borderRadius: 1.5,
                      flexShrink: 0,
                    }}
                  />
                ))}
              </Stack>
            </Paper>
          </Box>

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
            <Skeleton variant="text" width="35%" height={18} />
            <Skeleton
              variant="text"
              width="58%"
              height={46}
              sx={{ mt: 0.5 }}
            />
            <Skeleton
              variant="text"
              width="42%"
              height={18}
              sx={{ mt: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width="46%"
              height={22}
              sx={{ mt: 1.25, borderRadius: 1 }}
            />
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
            elevation={2}
            sx={{
              gridArea: { xs: "unset", sm: "purchase" },
              position: { xs: "fixed", sm: "static" },
              inset: { xs: "auto 0 0", sm: "auto" },
              zIndex: { xs: 10, sm: "auto" },
              borderRadius: { xs: "20px 20px 0 0", sm: 0 },
              p: { xs: "12px 16px", sm: 0 },
              boxShadow: {
                xs: "0 -8px 24px rgba(15, 23, 42, 0.10)",
                sm: "none",
              },
              bgcolor: { xs: "background.paper", sm: "transparent" },
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

          <Paper
            elevation={0}
            sx={{
              gridArea: "reviews",
              borderRadius: 2.5,
              p: { xs: 2, sm: 3 },
              mt: { xs: 0.5, sm: 2.5 },
            }}
          >
            <Skeleton variant="text" width="28%" height={36} />
            <Skeleton
              variant="rectangular"
              width="100%"
              height={180}
              sx={{ borderRadius: 2.5, mt: 2 }}
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              gridArea: "related",
              borderRadius: 2.5,
              p: { xs: 2, sm: 3 },
              mt: { xs: 1, sm: 2.5 },
              mb: { xs: 10, sm: 0 },
            }}
          >
            <Skeleton variant="text" width="32%" height={36} sx={{ mb: 2 }} />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(4, minmax(0, 1fr))",
                },
                gap: { xs: 1, sm: 2 },
              }}
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <Box key={index}>
                  <Skeleton
                    variant="rectangular"
                    height={160}
                    sx={{ borderRadius: 1 }}
                  />
                  <Skeleton variant="text" width="90%" sx={{ mt: 1 }} />
                  <Skeleton variant="text" width="70%" />
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
