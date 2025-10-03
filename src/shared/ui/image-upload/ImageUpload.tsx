"use client";

import { useState, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import { CloudUpload, Delete, Edit } from "@mui/icons-material";
import {
  ImageUploadContainer,
  ImagePreviewContainer,
  ImagePreview,
  ImageOverlay,
  HiddenInput,
  UploadButton,
} from "./ImageUpload.styled";

interface ImageUploadProps {
  imagePreview: string | null;
  imageError: string | null;
  isUploading: boolean;
  onImageChange: (file: File) => void;
  onDeleteImage: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  imagePreview,
  imageError,
  isUploading,
  onImageChange,
  onDeleteImage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageChange(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      onImageChange(file);
    }
  };

  const handleDeleteImage = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDeleteImage();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <ImageUploadContainer>
      <HiddenInput
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
      />

      {imagePreview ? (
        <ImagePreviewContainer
          className={`image-preview-container ${isDragOver ? "dragover" : ""}`}
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <ImagePreview src={imagePreview} alt="Предпросмотр изображения" />
          <ImageOverlay>
            <Box sx={{ display: "flex", gap: 1 }}>
              <IconButton
                size="small"
                sx={{
                  color: "white",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.3)",
                  },
                }}
              >
                <Edit />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleDeleteImage}
                sx={{
                  color: "white",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.3)",
                  },
                }}
              >
                <Delete />
              </IconButton>
            </Box>
          </ImageOverlay>
        </ImagePreviewContainer>
      ) : (
        <UploadButton
          className={`${imageError ? "error" : ""} ${
            isUploading ? "disabled" : ""
          }`}
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            ...(isDragOver && {
              borderColor: "primary.main",
              backgroundColor: "primary.light",
              opacity: 0.1,
            }),
          }}
        >
          {isUploading ? (
            <>
              <CircularProgress size={16} />
              <Typography variant="button">Загрузка...</Typography>
            </>
          ) : (
            <>
              <CloudUpload />
              <Typography variant="button">Загрузить изображение</Typography>
            </>
          )}
        </UploadButton>
      )}

      {imageError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {imageError}
        </Alert>
      )}
    </ImageUploadContainer>
  );
};
