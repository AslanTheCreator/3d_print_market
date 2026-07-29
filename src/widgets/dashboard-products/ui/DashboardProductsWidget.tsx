"use client";

import React from "react";
import { Add, Inventory2Outlined } from "@mui/icons-material";
import { Box, Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/shared/ui/page-header";

interface DashboardProductsWidgetProps {
  children?: React.ReactNode;
}

export const DashboardProductsWidget = ({
  children,
}: DashboardProductsWidgetProps) => {
  const router = useRouter();

  const handleCreateProduct = () => {
    router.push("/dashboard/products/new");
  };

  return (
    <Box sx={{ width: "100%", py: { xs: 2, sm: 3 }, pb: { xs: 12, sm: 3 } }}>
      <PageHeader
        title="Мои товары"
        icon={<Inventory2Outlined />}
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateProduct}
            size="large"
            sx={{
              width: { xs: "100%", sm: "auto" },
              py: { xs: 1, sm: 1.25 },
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
