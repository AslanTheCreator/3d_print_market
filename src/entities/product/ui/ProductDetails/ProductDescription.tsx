"use client";

import { Typography, Box, Paper } from "@mui/material";

interface ProductDescriptionProps {
  description: string;
}

export function ProductDescription({ description }: ProductDescriptionProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: 2.5 },
        overflow: "hidden",
        mb: { xs: 1.5, sm: 0 },
      }}
    >
      <Box p={{ xs: 1.5, sm: 2, md: 3 }}>
        <Typography
          variant="h6"
          fontWeight="bold"
          gutterBottom
          sx={{ fontSize: { xs: "1rem", sm: "1.125rem", md: "1.25rem" } }}
        >
          Описание
        </Typography>
        {!description ? (
          <Typography variant="body2" color="text.secondary">
            Описание товара отсутствует
          </Typography>
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              lineHeight: 1.6,
              whiteSpace: "pre-line",
            }}
          >
            {description}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
