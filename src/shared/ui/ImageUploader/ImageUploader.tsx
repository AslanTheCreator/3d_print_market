"use client";

import Image from "next/image";
import { useState } from "react";
import { Box, Button, FormHelperText, CircularProgress } from "@mui/material";
import { styled } from "@mui/material/styles";
import { CloudUpload } from "@mui/icons-material";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const ImagePreview = styled(Box)(({ theme }) => ({
  width: "100%",
  height: 150,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[100],
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  position: "relative",
  [theme.breakpoints.up("sm")]: {
    height: 200,
  },
}));

interface ImageUploaderProps {
  onImageChange: (file: File) => void;
  imagePreview: string | null;
  error: string | null;
  isUploading: boolean;
  hasImage: boolean;
}

export const ImageUploader = ({
  onImageChange,
  imagePreview,
  error,
  isUploading,
  hasImage,
}: ImageUploaderProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageChange(e.target.files[0]);
    }
  };

  return (
    <>
      <Button
        component="label"
        variant="outlined"
        startIcon={<CloudUpload />}
        fullWidth
        disabled={isUploading}
        sx={{
          height: 56,
          borderColor: error ? "error.main" : undefined,
          color: error ? "error.main" : undefined,
        }}
      >
        {isUploading ? (
          <>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            Загрузка...
          </>
        ) : hasImage ? (
          "Изменить изображение"
        ) : (
          "Загрузить изображение"
        )}
        <VisuallyHiddenInput
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </Button>

      {error && (
        <FormHelperText error sx={{ mt: 1 }}>
          {error}
        </FormHelperText>
      )}

      {imagePreview && (
        <ImagePreview>
          <Image
            src={imagePreview}
            alt="Предпросмотр товара"
            fill
            sizes="(max-width: 600px) 100vw, 600px"
            style={{ objectFit: "cover" }}
          />
        </ImagePreview>
      )}
    </>
  );
};
