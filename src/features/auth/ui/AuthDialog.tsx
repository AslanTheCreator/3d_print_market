"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Dialog, IconButton, alpha, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  closeLabel: string;
  busy?: boolean;
  children: ReactNode;
}

export const AuthDialog = ({
  open,
  onClose,
  titleId,
  closeLabel,
  busy = false,
  children,
}: AuthDialogProps) => {
  const theme = useTheme();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const viewport = window.visualViewport;
    const mobile = window.matchMedia(theme.breakpoints.down("sm").replace("@media ", ""));
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const useViewport = mobile.matches && viewport?.scale === 1;
        dialog.style.setProperty("--auth-viewport-height", useViewport ? `${viewport.height}px` : "100dvh");
        dialog.style.setProperty("--auth-viewport-top", useViewport ? `${viewport.offsetTop}px` : "0px");

        const paper = dialog.querySelector<HTMLElement>(".MuiDialog-paper");
        const active = document.activeElement;
        if (mobile.matches && paper && active instanceof HTMLElement && paper.contains(active)) {
          const bounds = paper.getBoundingClientRect();
          const field = active.getBoundingClientRect();
          if (field.bottom > bounds.bottom - 16) paper.scrollTop += field.bottom - bounds.bottom + 16;
          else if (field.top < bounds.top + 16) paper.scrollTop -= bounds.top + 16 - field.top;
        }
      });
    };

    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    mobile.addEventListener("change", measure);
    dialog.addEventListener("focusin", measure);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      mobile.removeEventListener("change", measure);
      dialog.removeEventListener("focusin", measure);
    };
  }, [open, theme]);

  return (
    <Dialog
      ref={dialogRef}
      open={open}
      onClose={() => { if (!busy) onClose(); }}
      aria-labelledby={titleId}
      maxWidth="sm"
      fullWidth
      sx={{
        "& .MuiDialog-container": {
          alignItems: { xs: "flex-end", sm: "center" },
          position: { xs: "relative", sm: "static" },
          top: { xs: "var(--auth-viewport-top, 0px)", sm: "auto" },
          height: { xs: "var(--auth-viewport-height, 100dvh)", sm: "100%" },
        },
        "@keyframes auth-sheet-enter": {
          from: { transform: "translateY(48px)" },
          to: { transform: "translateY(0)" },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: { xs: "24px 24px 0 0", sm: "16px" },
          overflow: { xs: "auto", sm: "visible" },
          overscrollBehavior: { xs: "contain", sm: "auto" },
          position: "relative",
          m: { xs: 0, sm: 3 },
          width: { xs: "100%", sm: "calc(100% - 64px)" },
          maxWidth: { xs: "100%", sm: 600 },
          maxHeight: {
            xs: "calc(var(--auth-viewport-height, 100dvh) - max(16px, env(safe-area-inset-top, 0px)))",
            sm: "calc(100% - 64px)",
          },
          animation: { xs: "auth-sheet-enter 200ms ease-out", sm: "none" },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        },
      }}
    >
      <IconButton
        aria-label={closeLabel}
        onClick={onClose}
        disabled={busy}
        sx={{
          position: "absolute", right: 8, top: 8, zIndex: 1,
          color: theme.palette.grey[400],
          "&:hover": { backgroundColor: alpha(theme.palette.grey[400], 0.1) },
        }}
      >
        <CloseIcon />
      </IconButton>
      {children}
    </Dialog>
  );
};

export const authDialogContentSx = {
  p: { xs: 2, sm: 4 },
  pt: { xs: 3, sm: 4 },
  pb: { xs: 1, sm: 3 },
  flex: { xs: "0 0 auto", sm: "1 1 auto" },
  overflow: { xs: "visible", sm: "auto" },
  textAlign: { xs: "left", sm: "center" },
} as const;

export const authDialogActionsSx = {
  p: { xs: 2, sm: 4 },
  pt: 0,
  pb: { xs: "max(16px, env(safe-area-inset-bottom, 0px))", sm: 4 },
  gap: { xs: 0.5, sm: 1.5 },
  flexDirection: { xs: "column", sm: "row" },
  "& > :not(style) ~ :not(style)": { ml: 0 },
} as const;
