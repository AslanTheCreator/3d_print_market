import type React from "react";
import { Chip, Stack } from "@mui/material";
import { ImageOutlined } from "@mui/icons-material";
import { PRODUCT_IMAGE_LIMIT } from "../../model";

interface CreateProductFormHeaderActionsProps {
  imageCount: number;
  isPreorder: boolean;
}

export const CreateProductFormHeaderActions = ({
  imageCount,
  isPreorder,
}: CreateProductFormHeaderActionsProps): React.ReactElement => {
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      <Chip
        icon={<ImageOutlined />}
        label={`${imageCount}/${PRODUCT_IMAGE_LIMIT} фото`}
        variant="outlined"
        size="small"
      />
      <Chip
        label={isPreorder ? "Предзаказ" : "В наличии"}
        color="primary"
        size="small"
      />
    </Stack>
  );
};
