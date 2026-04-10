"use client";
import React, { useState } from "react";
import { Box, Button, Collapse, Stack, Typography, Chip } from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import type { ListOrdersModel } from "../model/types";
import { useOrderStatusDictionary } from "../lib/useOrderStatusDictionary";

interface OrderHistoryProps {
  histories: ListOrdersModel["histories"];
}

const formatOrderHistoryDate = (value: string): string => {
  const normalizedCandidates = [
    value,
    value.replace(" ", "T"),
    value.replace(/\.(\d{3,})$/, ""),
    value.replace(" ", "T").replace(/\.(\d{3,})$/, ""),
  ];

  for (const candidate of normalizedCandidates) {
    const date = new Date(candidate);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  return value;
};

export const OrderHistory: React.FC<OrderHistoryProps> = ({ histories }) => {
  const [expanded, setExpanded] = useState(false);
  const { getStatusDescription, isLoading } = useOrderStatusDictionary();
  const latestHistory = histories[0];
  const olderHistories = histories.slice(1);

  if (histories.length === 0) return null;

  return (
    <Box>
      <Stack spacing={0.75}>
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 0.5 }}
          >
            Последнее изменение
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Chip
              label={
                isLoading
                  ? latestHistory.status
                  : getStatusDescription(latestHistory.status)
              }
              size="small"
              color="success"
              sx={{
                height: 20,
                fontSize: "0.7rem",
                fontWeight: 500,
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.68rem", sm: "0.72rem" } }}
            >
              {formatOrderHistoryDate(latestHistory.changedAt)}
            </Typography>
          </Stack>

          {latestHistory.comment && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.7rem", sm: "0.75rem" },
                display: "block",
              }}
            >
              {latestHistory.comment}
            </Typography>
          )}
        </Box>

        {olderHistories.length > 0 && (
          <>
            <Button
              endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
              onClick={() => setExpanded(!expanded)}
              size="small"
              sx={{
                alignSelf: "flex-start",
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
              {expanded ? "Скрыть историю" : `Вся история (${histories.length})`}
            </Button>

            <Collapse in={expanded} timeout="auto">
              <Stack spacing={1} sx={{ pt: 0.5 }}>
                {olderHistories.map((history, index) => (
                  <Box
                    key={index}
                    sx={{
                      pt: 1,
                      borderTop: "1px dashed",
                      borderColor: "divider",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mb: history.comment ? 0.25 : 0 }}
                    >
                      <Chip
                        label={
                          isLoading
                            ? history.status
                            : getStatusDescription(history.status)
                        }
                        size="small"
                        variant="outlined"
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
                        {formatOrderHistoryDate(history.changedAt)}
                      </Typography>
                    </Stack>

                    {history.comment && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: { xs: "0.7rem", sm: "0.75rem" },
                          display: "block",
                        }}
                      >
                        {history.comment}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Collapse>
          </>
        )}
      </Stack>
    </Box>
  );
};
