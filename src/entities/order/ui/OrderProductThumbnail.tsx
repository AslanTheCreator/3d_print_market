"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Box, ButtonBase } from "@mui/material";
import type { ImageMetadata } from "@/entities/image/@x/order";
import { getImageUrl } from "@/shared/lib";
import { ImageFallback } from "@/shared/ui/image-fallback";

const FullscreenImageViewer = dynamic(
  () => import("@/shared/ui/image-gallery").then(module => module.FullscreenImageViewer),
  { ssr: false },
);

interface OrderProductThumbnailProps {
  image?: ImageMetadata;
  name: string;
  size: number;
  zoomable?: boolean;
}

export function OrderProductThumbnail(props: OrderProductThumbnailProps) {
  const src = getImageUrl(props.image, "thumbnail");
  return <Thumbnail key={src} src={src} {...props} />;
}

function Thumbnail({ image, name, size, zoomable, src }: OrderProductThumbnailProps & { src?: string }) {
  const [hasImageError, setHasImageError] = useState(false);
  const [open, setOpen] = useState(false);

  const thumbnail = src && !hasImageError ? (
    <Box
      component="img"
      src={src}
      alt={name}
      onError={() => setHasImageError(true)}
      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  ) : null;

  return (
    <Box sx={{
      width: size, height: size, borderRadius: 1.5, overflow: "hidden",
      bgcolor: "grey.100", flexShrink: 0, display: "grid", placeItems: "center",
    }}>
      {thumbnail && zoomable ? (
        <ButtonBase
          aria-label={`Открыть фото товара: ${name}`}
          onClick={() => setOpen(true)}
          sx={{ width: "100%", height: "100%", "&.Mui-focusVisible": { outline: "2px solid", outlineOffset: -2 } }}
        >
          {thumbnail}
        </ButtonBase>
      ) : thumbnail ?? <ImageFallback compact label="Нет фото" />}
      {open && src && (
        <FullscreenImageViewer
          open
          onClose={() => setOpen(false)}
          alt={name}
          images={[{
            thumbnailSrc: src,
            previewSrc: getImageUrl(image, "medium") ?? src,
            originalSrc: getImageUrl(image, "original"),
          }]}
        />
      )}
    </Box>
  );
}
