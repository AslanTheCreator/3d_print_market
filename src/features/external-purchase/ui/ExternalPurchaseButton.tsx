"use client";

import { useState, type MouseEvent } from "react";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { getSafeExternalUrl } from "@/shared/lib";

const INVALID_EXTERNAL_URL_MESSAGE =
  "Продавец не указал корректную ссылку";

export interface ExternalPurchaseButtonProps {
  externalUrl: string;
  label?: string;
  variant?: "default" | "detailed";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  disabled?: boolean;
}

export function ExternalPurchaseButton({
  externalUrl,
  label = "Купить",
  variant = "default",
  size = "medium",
  fullWidth = true,
  disabled = false,
}: ExternalPurchaseButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const safeExternalUrl = getSafeExternalUrl(externalUrl);
  const hasInvalidUrl = safeExternalUrl === null;

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
  };

  const button = (
    <Button
      onClick={handleOpen}
      variant="contained"
      fullWidth={fullWidth}
      disabled={disabled || hasInvalidUrl}
      size={size}
      startIcon={
        variant === "default" ? (
          <ShoppingCartOutlinedIcon
            sx={{ fontSize: isMobile ? "0.875rem" : "1rem" }}
          />
        ) : undefined
      }
      sx={{
        fontWeight: 600,
        transition: "all 0.2s ease-in-out",
        py: variant === "detailed" ? 1.5 : isMobile ? 0.75 : 1,
        fontSize:
          variant === "detailed"
            ? "16px"
            : isMobile
              ? "0.75rem"
              : "0.875rem",
        borderRadius:
          variant === "detailed" ? "12px" : isMobile ? 1 : 1.5,
        "&:hover": {
          bgcolor: "primary.dark",
        },
      }}
    >
      {label}
    </Button>
  );

  return (
    <>
      {hasInvalidUrl && !disabled ? (
        <Tooltip title={INVALID_EXTERNAL_URL_MESSAGE} arrow placement="top">
          <Box
            component="span"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            sx={{
              display: fullWidth ? "block" : "inline-block",
              width: fullWidth ? "100%" : "auto",
            }}
          >
            {button}
          </Box>
        </Tooltip>
      ) : (
        button
      )}

      <Dialog
        open={isDialogOpen && safeExternalUrl !== null}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        aria-labelledby="external-purchase-dialog-title"
        aria-describedby="external-purchase-dialog-description"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogTitle id="external-purchase-dialog-title">
          Покупка через Telegram
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="external-purchase-dialog-description">
            Данный товар можно приобрести только через telegram канал продавца.
            Перейти на канал продавца для уточнения наличия?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          {safeExternalUrl ? (
            <Button
              component="a"
              href={safeExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              onClick={handleClose}
              style={{ color: "#fff" }}
              sx={{
                color: "#fff",
                "&:hover, &:focus-visible, &:active, &:visited": {
                  color: "#fff",
                },
              }}
            >
              Перейти в Telegram
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </>
  );
}
