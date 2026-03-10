"use client";
import React, { useState } from "react";
import { Box, Button, Collapse, Stack, Typography, Chip } from "@mui/material";
import { ExpandMore, ExpandLess, History } from "@mui/icons-material";
import type { ListOrdersModel } from "../model/types";
import { useOrderStatusDictionary } from "../lib/useOrderStatusDictionary";

interface OrderHistoryProps {
  histories: ListOrdersModel["histories"];
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ histories }) => {
  const [expanded, setExpanded] = useState(false);
  const { getStatusDescription, isLoading } = useOrderStatusDictionary();

  if (histories.length === 0) return null;

  return (
    <Box>
      <Button
        startIcon={<History sx={{ fontSize: 16 }} />}
        endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
        onClick={() => setExpanded(!expanded)}
        size="small"
        sx={{
          fontSize: { xs: "0.7rem", sm: "0.75rem" },
          textTransform: "none",
          fontWeight: 600,
          color: "text.secondary",
          px: 0,
          minWidth: "auto",
          "&:hover": {
            bgcolor: "transparent",
            color: "primary.main",
          },
        }}
      >
        История ({histories.length})
      </Button>

      <Collapse in={expanded} timeout="auto">
        <Stack spacing={1} sx={{ mt: 1 }}>
          {histories.map((history, index) => (
            <Box
              key={index}
              sx={{
                pl: 2,
                borderLeft: "2px solid",
                borderColor: index === 0 ? "success.main" : "divider",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 0.25 }}
              >
                <Chip
                  label={
                    isLoading
                      ? history.status
                      : getStatusDescription(history.status)
                  }
                  size="small"
                  variant="outlined"
                  color={index === 0 ? "success" : "default"}
                  sx={{
                    height: 18,
                    fontSize: "0.65rem",
                    fontWeight: 500,
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: { xs: "0.65rem", sm: "0.7rem" } }}
                >
                  {new Date(history.changedAt).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Stack>

              {history.comment && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                    display: "block",
                    fontStyle: "italic",
                  }}
                >
                  {history.comment}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
};
