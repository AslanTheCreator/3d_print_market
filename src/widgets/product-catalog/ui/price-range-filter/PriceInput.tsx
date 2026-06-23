import type React from "react";
import { Box, InputBase, Typography } from "@mui/material";
import { normalizeInputValue } from "./model";

interface PriceInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  compact?: boolean;
}

export const PriceInput = ({
  label,
  value,
  onChange,
  onSubmit,
  compact = false,
}: PriceInputProps): React.ReactElement => {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: compact ? 0.5 : 0.75, pl: 0.25 }}
      >
        {label}
      </Typography>

      <Box
        sx={{
          px: compact ? 1.5 : 2,
          py: compact ? 0.875 : 1.5,
          height: compact ? 36 : "auto",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          borderRadius: 2.5,
          bgcolor: "#eef1f5",
          transition:
            "box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease",
          border: "1px solid",
          borderColor: "#eef1f5",
          "&:focus-within": {
            bgcolor: "background.paper",
            borderColor: "rgba(239, 66, 132, 0.28)",
            boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
          },
        }}
      >
        <InputBase
          value={value}
          onChange={(event) => onChange(normalizeInputValue(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="0"
          inputProps={{
            inputMode: "numeric",
            "aria-label": label,
          }}
          sx={{
            width: "100%",
            height: "100%",
            fontSize: compact ? 14 : 16,
            fontWeight: 500,
            lineHeight: 1.2,
          }}
        />
      </Box>
    </Box>
  );
};
