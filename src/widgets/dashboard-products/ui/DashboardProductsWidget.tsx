"use client";

import React from "react";
import { Add } from "@mui/icons-material";
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useProfileUser } from "@/entities/user";
import { UserProductsList } from "@/widgets/user-products";

export const DashboardProductsWidget = () => {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: user } = useProfileUser();

  const handleCreateProduct = () => {
    router.push("/dashboard/products/new");
  };

  return (
    <Container
      maxWidth="lg"
      sx={{ py: { xs: 2, sm: 4 }, pb: { xs: 12, sm: 4 } }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            fontWeight={700}
            sx={{ mb: 0.5 }}
          >
            {"\u041c\u043e\u0438 \u0442\u043e\u0432\u0430\u0440\u044b"}
          </Typography>
          {user && (
            <Typography variant="body2" color="text.secondary">
              {`\u041f\u0440\u043e\u0434\u0430\u0432\u0435\u0446: ${user.login}`}
            </Typography>
          )}
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            width: { xs: "100%", sm: "auto" },
          }}
        >
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateProduct}
            size={isMobile ? "medium" : "large"}
            fullWidth={isMobile}
            sx={{
              fontWeight: 600,
              boxShadow: 2,
              "&:hover": {
                boxShadow: 4,
              },
            }}
          >
            {"\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0442\u043e\u0432\u0430\u0440"}
          </Button>
        </Stack>
      </Stack>

      <UserProductsList participantId={user?.id} />
    </Container>
  );
};
