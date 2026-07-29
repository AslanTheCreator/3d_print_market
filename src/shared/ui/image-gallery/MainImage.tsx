"use client";

import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import Image from "next/image";
import { ImageFallback } from "@/shared/ui/image-fallback";

interface MainImageProps {
  src?: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
}

export function MainImage({
  src,
  alt,
  priority = false,
  sizes = "(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw",
}: MainImageProps) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [src]);

  const imageSrc = src && !hasImageError ? src : null;

  return (
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
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          style={{
            objectFit: "contain",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onError={() => setHasImageError(true)}
        />
      ) : (
        <ImageFallback />
      )}
    </Box>
  );
}
