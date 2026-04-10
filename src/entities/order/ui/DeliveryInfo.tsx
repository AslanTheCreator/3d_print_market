"use client";
import React, { useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  Link,
} from "@mui/material";
import {
  LocationOn,
  ContentCopy,
  CheckCircle,
  OpenInNew,
} from "@mui/icons-material";
import type { ListOrdersModel } from "../model/types";

interface DeliveryInfoProps {
  transfer: ListOrdersModel["transfer"];
  /** Ссылка для отслеживания посылки (из order.deliveryUrl) */
  deliveryUrl?: string;
}

export const DeliveryInfo: React.FC<DeliveryInfoProps> = ({
  transfer,
  deliveryUrl,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async () => {
    if (!deliveryUrl) return;
    try {
      await navigator.clipboard.writeText(deliveryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — не критично
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <LocationOn sx={{ fontSize: 16, color: "text.secondary", mt: 0.1 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              lineHeight: 1.4,
              mb: 0.75,
            }}
          >
            {transfer.address}
          </Typography>
          <Chip
            label={
              transfer.price === 0
                ? "Бесплатная доставка"
                : `Доставка ${transfer.price} ${transfer.currency}`
            }
            size="small"
            color={transfer.price === 0 ? "success" : "default"}
            sx={{ height: 20, fontSize: "0.7rem" }}
          />
        </Box>
      </Stack>

      {/* Ссылка для отслеживания */}
      {deliveryUrl && (
        <Paper
          variant="outlined"
          sx={{
            mt: 1.25,
            p: 1.25,
            borderColor: "info.main",
            borderLeftWidth: 3,
            bgcolor: "background.paper",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ fontSize: { xs: "0.65rem", sm: "0.7rem" } }}
              >
                Отслеживание посылки
              </Typography>
              <Link
                href={deliveryUrl}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{
                  display: "block",
                  fontSize: { xs: "0.68rem", sm: "0.72rem" },
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                  lineHeight: 1.4,
                  mt: 0.25,
                }}
              >
                {deliveryUrl}
              </Link>
            </Box>

            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
              <Tooltip title={copied ? "Скопировано!" : "Копировать ссылку"}>
                <IconButton size="small" onClick={handleCopyUrl}>
                  {copied ? (
                    <CheckCircle fontSize="small" color="success" />
                  ) : (
                    <ContentCopy sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title="Открыть в новой вкладке">
                <IconButton
                  size="small"
                  href={deliveryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  component="a"
                >
                  <OpenInNew sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};
