"use client";

import type React from "react";
import { Box } from "@mui/material";
import { SellOutlined } from "@mui/icons-material";
import { PageHeader } from "@/shared/ui/page-header";
import { useProductForm } from "../model";
import { CreateProductFormContent } from "./components/CreateProductFormContent";
import { CreateProductFormHeaderActions } from "./components/CreateProductFormHeaderActions";

interface CreateProductFormProps {
  mode?: "create" | "edit";
  productId?: string;
}

export const CreateProductForm = ({
  mode = "create",
  productId,
}: CreateProductFormProps): React.ReactElement => {
  const formState = useProductForm({ mode, productId });

  return (
    <Box sx={{ width: "100%", py: mode === "create" ? { xs: 1, md: 3 } : { xs: 2, sm: 3 } }}>
      <Box sx={{ display: mode === "create" ? { xs: "none", md: "block" } : "block" }}>
      <PageHeader
        title={
          formState.isProductReadOnly
            ? "Внешний товар"
            : formState.isEditMode
              ? "Редактировать товар"
              : "Создать товар"
        }
        icon={<SellOutlined />}
        backLabel="К товарам"
        hideBackBelowMd
        onBack={formState.isEditMode ? formState.handleBack : undefined}
        actions={
          <CreateProductFormHeaderActions
            availability={formState.availability}
            imageCount={formState.imageUploadState.images.length}
            isProductReadOnly={formState.isProductReadOnly}
          />
        }
      />
      </Box>

      <CreateProductFormContent mode={mode} formState={formState} />
    </Box>
  );
};
