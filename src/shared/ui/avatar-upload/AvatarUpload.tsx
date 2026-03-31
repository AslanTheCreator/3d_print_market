import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { PhotoCamera, Delete } from "@mui/icons-material";
import { useState, useRef } from "react";
import {
  AvatarUploadContainer,
  AvatarPreview,
  AvatarOverlay,
  HiddenInput,
} from "./AvatarUpload.styled";

interface AvatarUploadProps {
  imagePreview: string | null;
  imageError: string | null;
  isUploading: boolean;
  onImageChange: (file: File) => void;
  onDeleteImage: () => void;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  imagePreview,
  imageError,
  isUploading,
  onImageChange,
  onDeleteImage,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageChange(file);
    }
  };

  const handleAvatarClick = () => {
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

  const handleDeleteAvatar = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDeleteImage();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Box sx={{ width: "100%", textAlign: "center" }}>
        <AvatarUploadContainer
          className={`avatar-upload ${isDragOver ? "dragover" : ""}`}
          onClick={handleAvatarClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{ position: "relative" }}
        >
          <HiddenInput
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
          />

          {imagePreview ? (
            <>
              <Box sx={{ position: "relative" }}>
                <AvatarPreview src={imagePreview} />
                <AvatarOverlay>
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
                      <PhotoCamera />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={handleDeleteAvatar}
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
                </AvatarOverlay>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {isMobile
                  ? "Нажмите, чтобы обновить фото"
                  : "Нажмите или перетащите новое фото, чтобы обновить аватар"}
              </Typography>
            </>
          ) : (
            <>
              <AvatarPreview>
                {isUploading ? (
                  <CircularProgress size={isMobile ? 34 : 40} />
                ) : (
                  <PhotoCamera
                    sx={{ fontSize: isMobile ? "2.4rem" : "3rem", color: "text.secondary" }}
                  />
                )}
              </AvatarPreview>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant={isMobile ? "body2" : "subtitle1"}
                  sx={{ fontWeight: 700, mb: 0.25 }}
                >
                  {isUploading ? "Загрузка..." : "Загрузить фото"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isMobile
                    ? "JPG, PNG, WEBP до 5 МБ"
                    : "Перетащите файл сюда или нажмите для выбора. JPG, PNG, WEBP до 5 МБ"}
                </Typography>
              </Box>
            </>
          )}
        </AvatarUploadContainer>

        {imageError && (
          <Alert severity="error" sx={{ mt: 1.5, textAlign: "left" }}>
            {imageError}
          </Alert>
        )}
      </Box>
    </Box>
  );
};
