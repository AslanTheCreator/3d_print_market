import type React from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";

interface PaymentAccountsFormFooterProps {
  canSubmit: boolean;
  hasBlockingValidationErrors: boolean;
  hasChanges: boolean;
  isPending: boolean;
  statusText: string;
}

export const PaymentAccountsFormFooter = ({
  canSubmit,
  hasBlockingValidationErrors,
  hasChanges,
  isPending,
  statusText,
}: PaymentAccountsFormFooterProps): React.ReactElement => {
  return (
    <Box
      sx={{
        mt: 4,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Typography
        variant="body2"
        color={
          hasBlockingValidationErrors
            ? "error.main"
            : hasChanges
              ? "text.primary"
              : "text.secondary"
        }
      >
        {statusText}
      </Typography>

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={!canSubmit}
        sx={{ minWidth: { xs: "100%", sm: 180 } }}
        startIcon={
          isPending ? (
            <CircularProgress size={16} color="inherit" />
          ) : undefined
        }
      >
        {isPending ? "Сохранение..." : "Сохранить"}
      </Button>
    </Box>
  );
};
