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
    <Box sx={{ width: "100%", py: { xs: 2, sm: 3 } }}>
      <PageHeader
        title={formState.isEditMode ? "Редактировать товар" : "Создать товар"}
        icon={<SellOutlined />}
        backLabel="К товарам"
        onBack={formState.isEditMode ? formState.handleBack : undefined}
        actions={
          <CreateProductFormHeaderActions
            imageCount={formState.imageUploadState.images.length}
            isPreorder={formState.isPreorder}
          />
        }
      />

      <CreateProductFormContent mode={mode} formState={formState} />
    </Box>
  );
};
