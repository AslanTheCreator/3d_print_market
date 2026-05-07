"use client";

import type { ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, IconButton, Modal, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { LAYOUT } from "@/shared/config";

interface AgeVerificationGateProps {
  children: ReactNode;
  open: boolean;
  onConfirm: () => void;
  onReject: () => void;
}

export const AgeVerificationGate = ({
  children,
  open,
  onConfirm,
  onReject,
}: AgeVerificationGateProps) => {
  return (
    <Box sx={{ position: "relative", minHeight: "inherit" }}>
      <Box
        aria-hidden={open}
        sx={{
          filter: open ? "blur(8px)" : "none",
          pointerEvents: open ? "none" : "auto",
          userSelect: open ? "none" : "auto",
          transition: (theme) =>
            theme.transitions.create("filter", {
              duration: theme.transitions.duration.short,
            }),
        }}
      >
        {children}
      </Box>

      <Modal
        open={open}
        onClose={onReject}
        aria-labelledby="age-verification-title"
        aria-describedby="age-verification-description"
        slotProps={{
          backdrop: {
            sx: {
              top: LAYOUT.HEADER_HEIGHT_PX,
              backgroundColor: (theme) => alpha(theme.palette.common.black, 0.18),
              backdropFilter: "blur(4px)",
            },
          },
        }}
        sx={{
          top: LAYOUT.HEADER_HEIGHT_PX,
        }}
      >
        <Box
          sx={{
            minHeight: `calc(100vh - ${LAYOUT.HEADER_HEIGHT_PX})`,
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "center",
            px: 2,
            py: { xs: 4, sm: 6 },
            overflowY: "auto",
          }}
        >
          <Box
            role="dialog"
            aria-modal="true"
            aria-labelledby="age-verification-title"
            aria-describedby="age-verification-description"
            sx={{
              position: "relative",
              width: "100%",
              maxWidth: 525,
              p: { xs: 3, sm: 5 },
              borderRadius: 3,
              backgroundColor: "background.paper",
              boxShadow: (theme) => theme.shadows[12],
            }}
          >
            <IconButton
              aria-label="Закрыть подтверждение возраста"
              onClick={onReject}
              sx={{
                position: "absolute",
                top: { xs: 12, sm: 16 },
                right: { xs: 12, sm: 16 },
                color: "text.disabled",
              }}
            >
              <CloseIcon />
            </IconButton>

            <Typography
              id="age-verification-title"
              variant="h3"
              component="h2"
              sx={{
                mb: 3,
                pr: 5,
                fontWeight: 700,
                color: "text.primary",
              }}
            >
              Подтвердите свой возраст
            </Typography>

            <Typography
              id="age-verification-description"
              variant="h6"
              component="p"
              sx={{
                mb: 5,
                maxWidth: 430,
                fontWeight: 600,
                color: "text.secondary",
              }}
            >
              Данный раздел предназначен только для посетителей, достигших
              возраста 18 лет!
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{
                "& .MuiButton-root": {
                  minHeight: 56,
                  px: 3,
                  borderRadius: 3,
                  fontSize: "1rem",
                },
              }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={onConfirm}
                sx={{
                  flex: 1,
                  fontWeight: 700,
                }}
              >
                Да, мне есть 18 лет
              </Button>
              <Button
                variant="text"
                color="primary"
                onClick={onReject}
                sx={{
                  flex: 0.82,
                  fontWeight: 700,
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  "&:hover": {
                    backgroundColor: (theme) =>
                      alpha(theme.palette.primary.main, 0.16),
                  },
                }}
              >
                Нет
              </Button>
            </Stack>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};
