"use client";

import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { memo } from "react";

interface MainImageProps {
  src?: string;
  alt: string;
  priority?: boolean;
}

export const MainImage = memo<MainImageProps>(
  ({ src, alt, priority = false }) => (
    <Box
      sx={{
        width: "100%",
        position: "relative",
        overflow: "hidden",
        aspectRatio: "4/3",
        borderRadius: 1,
        bgcolor: "grey.100",
      }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
          style={{
            objectFit: "cover",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      ) : (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "grey.200",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Изображение отсутствует
          </Typography>
        </Box>
      )}
    </Box>
  )
);

MainImage.displayName = "MainImage";
