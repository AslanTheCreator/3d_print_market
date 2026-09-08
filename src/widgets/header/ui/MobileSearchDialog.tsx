"use client";

import { Suspense, useEffect } from "react";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { SearchForm } from "./SearchForm";

interface MobileSearchDialogProps {
  open: boolean;
  onClose: () => void;
}

const SearchFallback = () => (
  <Box
    role="status"
    sx={{ minHeight: 48, display: "grid", placeItems: "center" }}
  >
    <CircularProgress size={22} />
  </Box>
);

export const MobileSearchDialog = ({
  open,
  onClose,
}: MobileSearchDialogProps) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const titleId = "mobile-search-dialog-title";

  useEffect(() => {
    if (open && isDesktop) onClose();
  }, [isDesktop, onClose, open]);

  return (
    <Dialog
      id="mobile-search-dialog"
      open={open}
      onClose={onClose}
      fullScreen
      aria-labelledby={titleId}
      PaperProps={{
        style: {
          margin: 0,
          width: "100%",
          maxWidth: "none",
          borderRadius: 0,
        },
        sx: {
          m: 0,
          width: "100%",
          maxWidth: "none",
          height: "100dvh",
          maxHeight: "100dvh",
          borderRadius: 0,
          overscrollBehavior: "contain",
          pt: "env(safe-area-inset-top, 0px)",
          pb: "env(safe-area-inset-bottom, 0px)",
        },
      }}
    >
      <DialogTitle
        id={titleId}
        component="div"
        sx={{
          minHeight: 56,
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1,
          py: 0,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <IconButton onClick={onClose} aria-label="Закрыть поиск">
          <ArrowBackIcon />
        </IconButton>
        <Typography component="h2" variant="h6">
          Поиск
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ overflowY: "auto", px: 2, pt: 2 }}>
        <Suspense fallback={<SearchFallback />}>
          <SearchForm
            variant="dialog"
            placeholder="Название товара"
            autoFocus
            onNavigate={onClose}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
};
