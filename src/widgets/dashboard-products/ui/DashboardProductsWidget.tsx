"use client";

import React from "react";
import { Add, Inventory2Outlined } from "@mui/icons-material";
import {
  Box,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useProfileUser } from "@/entities/user";
import { PageHeader } from "@/shared/ui/page-header";

interface DashboardProductsWidgetProps {
  children?: React.ReactNode;
}

export const DashboardProductsWidget = ({
  children,
}: DashboardProductsWidgetProps) => {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: user } = useProfileUser();

  const handleCreateProduct = () => {
    router.push("/dashboard/products/new");
  };

  return (
    <Box sx={{ width: "100%", py: { xs: 2, sm: 3 }, pb: { xs: 12, sm: 3 } }}>
      <PageHeader
        title="Мои товары"
        subtitle={
          user
            ? `Продавец: ${user.login}`
            : "Управляйте товарами и создавайте новые позиции."
        }
        icon={<Inventory2Outlined />}
        actions={
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
            Создать товар
          </Button>
        }
      />

      {children}
    </Box>
  );
};
