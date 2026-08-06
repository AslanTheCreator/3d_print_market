import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import { PhotoCamera, Delete } from "@mui/icons-material";
import { useId, useRef, useState } from "react";
import {
  AvatarUploadContainer,
  AvatarPreview,
  AvatarOverlay,
  AvatarSelectButton,
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
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

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
    if (!isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (!isUploading && file && file.type.startsWith("image/")) {
      onImageChange(file);
    }
  };

  const handleDeleteAvatar = () => {
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
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-busy={isUploading}
          sx={{ position: "relative" }}
        >
          <HiddenInput
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            tabIndex={-1}
          />

          <AvatarSelectButton
            className="avatar-select"
            type="button"
            onClick={handleAvatarClick}
            disabled={isUploading}
            aria-busy={isUploading}
            aria-describedby={imageError ? errorId : undefined}
            aria-label={
              imagePreview
                ? "Выбрать новую фотографию профиля"
                : "Выбрать фотографию профиля"
            }
          >
            {imagePreview ? (
              <>
                <Box sx={{ position: "relative" }}>
                  <AvatarPreview
                    src={imagePreview}
                    alt="Текущая фотография профиля"
                  />
                  <AvatarOverlay aria-hidden="true">
                    <PhotoCamera sx={{ color: "white", fontSize: "2rem" }} />
                  </AvatarOverlay>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  <Box
                    component="span"
                    sx={{ display: { xs: "inline", sm: "none" } }}
                  >
                    Нажмите, чтобы обновить фото
                  </Box>
                  <Box
                    component="span"
                    sx={{ display: { xs: "none", sm: "inline" } }}
                  >
                    Нажмите или перетащите новое фото, чтобы обновить аватар
                  </Box>
                </Typography>
              </>
            ) : (
              <>
                <AvatarPreview>
                  {isUploading ? (
                    <Box
                      sx={{
                        width: { xs: 34, sm: 40 },
                        height: { xs: 34, sm: 40 },
                      }}
                    >
                      <CircularProgress size="100%" />
                    </Box>
                  ) : (
                    <PhotoCamera
                      sx={{
                        fontSize: { xs: "2.4rem", sm: "3rem" },
                        color: "text.secondary",
                      }}
                    />
                  )}
                </AvatarPreview>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                      fontWeight: 700,
                      mb: 0.25,
                    }}
                  >
                    {isUploading ? "Загрузка..." : "Загрузить фото"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    <Box
                      component="span"
                      sx={{ display: { xs: "inline", sm: "none" } }}
                    >
                      JPG, PNG, WEBP до 5 МБ
                    </Box>
                    <Box
                      component="span"
                      sx={{ display: { xs: "none", sm: "inline" } }}
                    >
                      Перетащите файл сюда или нажмите для выбора. JPG, PNG, WEBP
                      до 5 МБ
                    </Box>
                  </Typography>
                </Box>
              </>
            )}
          </AvatarSelectButton>

          {imagePreview && (
            <IconButton
              type="button"
              aria-label="Удалить фотографию профиля"
              onClick={handleDeleteAvatar}
              disabled={isUploading}
              sx={{
                position: "absolute",
                zIndex: 1,
                top: { xs: 16, sm: 20 },
                right: {
                  xs: "calc(50% - 48px)",
                  sm: "calc(50% - 60px)",
                },
                width: 44,
                height: 44,
                color: "white",
                backgroundColor: "rgba(0, 0, 0, 0.65)",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.78)",
                },
              }}
            >
              <Delete />
            </IconButton>
          )}
        </AvatarUploadContainer>

        {imageError && (
          <Alert
            id={errorId}
            severity="error"
            sx={{ mt: 1.5, textAlign: "left" }}
          >
            {imageError}
          </Alert>
        )}
      </Box>
    </Box>
  );
};
