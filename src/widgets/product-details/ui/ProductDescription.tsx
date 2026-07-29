"use client";

import React from "react";
import { Button, Stack, Typography, TypographyProps } from "@mui/material";

interface ProductDescriptionProps {
  description?: string;
  titleVariant?: TypographyProps["variant"];
  collapsedLines?: number;
}

const COLLAPSE_THRESHOLD = 150;

export function ProductDescription({
  description,
  titleVariant = "h6",
  collapsedLines = 5,
}: ProductDescriptionProps) {
  const [expanded, setExpanded] = React.useState(false);
  const descriptionId = React.useId();

  const text = description?.trim() || "Описание отсутствует";
  const canCollapse =
    text !== "Описание отсутствует" &&
    (text.length > COLLAPSE_THRESHOLD || text.includes("\n"));

  return (
    <Stack spacing={1.5}>
      <Typography
        variant={titleVariant}
        fontWeight={600}
        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
      >
        Описание
      </Typography>

      <Typography
        id={descriptionId}
        variant="body2"
        color="text.secondary"
        sx={{
          lineHeight: 1.8,
          whiteSpace: "pre-line",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          ...(canCollapse &&
            !expanded && {
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: { xs: Math.min(collapsedLines, 4), sm: collapsedLines },
              overflow: "hidden",
            }),
        }}
      >
        {text}
      </Typography>

      {canCollapse && (
        <Button
          data-testid="product-description-toggle"
          variant="text"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls={descriptionId}
          sx={{
            alignSelf: "flex-start",
            px: 0,
            minWidth: 0,
            fontWeight: 600,
            textTransform: "none",
            color: "text.primary",
            borderRadius: 0,
            "&:hover": {
              bgcolor: "transparent",
              color: "primary.main",
            },
          }}
        >
          {expanded ? "Свернуть" : "Показать полностью"}
        </Button>
      )}
    </Stack>
  );
}
