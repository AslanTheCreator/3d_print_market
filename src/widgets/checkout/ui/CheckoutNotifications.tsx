import React from "react";
import { Snackbar, Alert } from "@mui/material";

type CheckoutNotificationsProps = {
  open: boolean;
  message: string;
  severity: "success" | "error" | "warning";
  onClose: () => void;
};

export const CheckoutNotifications: React.FC<CheckoutNotificationsProps> = ({
  open,
  message,
  severity,
  onClose,
}) => (
  <Snackbar
    open={open}
    autoHideDuration={4000}
    onClose={onClose}
    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
  >
    <Alert
      onClose={onClose}
      severity={severity}
      variant="filled"
      sx={{ width: "100%" }}
    >
      {message}
    </Alert>
  </Snackbar>
);
