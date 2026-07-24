import type React from "react";
import { Chip, Stack } from "@mui/material";
import { ImageOutlined } from "@mui/icons-material";
import type { EditableAvailability } from "@/entities/product";
import { PRODUCT_IMAGE_LIMIT } from "../../model";

interface CreateProductFormHeaderActionsProps {
  availability: EditableAvailability;
  imageCount: number;
  isProductReadOnly: boolean;
}

export const CreateProductFormHeaderActions = ({
  availability,
  imageCount,
  isProductReadOnly,
}: CreateProductFormHeaderActionsProps): React.ReactElement => {
  const availabilityLabel = isProductReadOnly
    ? "Внешний товар · только просмотр"
    : availability === "PREORDER"
      ? "Предзаказ"
      : "В наличии";

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {!isProductReadOnly && (
        <Chip
          icon={<ImageOutlined />}
          label={`${imageCount}/${PRODUCT_IMAGE_LIMIT} фото`}
          variant="outlined"
          size="small"
        />
      )}
      <Chip
        label={availabilityLabel}
        color="primary"
        size="small"
      />
    </Stack>
  );
};
