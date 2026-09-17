import { useEffect, useRef } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { useSettingsPanel } from "../model/SettingsPanelContext";
import { useSettingsSaveBar } from "../model/useSettingsSaveBar";

export const SettingsFormFooter = ({ canSubmit, hasBlockingValidationErrors, hasChanges, isPending, statusText, saveError, needsRefresh, onRetry }: {
  canSubmit: boolean;
  hasBlockingValidationErrors: boolean;
  hasChanges: boolean;
  isPending: boolean;
  statusText: string;
  saveError: string | null;
  needsRefresh: boolean;
  onRetry: () => void;
}) => {
  const { active } = useSettingsPanel(hasChanges || needsRefresh || isPending);
  const floating = hasChanges || needsRefresh || isPending;
  const barRef = useSettingsSaveBar(active && floating);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (saveError && active) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [saveError, active]);
  return (
    <>
      {saveError && <Alert ref={errorRef} severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
      {floating && <Box sx={{ display: { xs: "block", md: "none" }, height: "var(--settings-action-height, 112px)" }} />}
      <Box ref={barRef} sx={{
        mt: { xs: floating ? 0 : 2, md: 4 },
        display: "flex", flexDirection: { xs: "column", md: "row" },
        alignItems: { xs: "stretch", md: "center" }, justifyContent: "space-between", gap: { xs: 1, md: 2 },
        ...(floating && {
          position: { xs: "fixed", md: "static" }, left: 0, right: 0,
          bottom: "max(var(--shell-bottom-offset, 0px), var(--settings-keyboard-offset, 0px))",
          zIndex: (theme) => theme.zIndex.appBar - 1,
          bgcolor: "background.paper", px: { xs: 2, md: 0 }, py: { xs: 1.5, md: 0 },
          borderTop: { xs: "1px solid", md: "none" }, borderColor: "divider",
        }),
      }}>
        <Typography role="status" variant="body2" color={hasBlockingValidationErrors || saveError ? "error.main" : "text.secondary"}>
          {needsRefresh ? "Проверьте результат сохранения" : statusText}
        </Typography>
        <Button type={needsRefresh ? "button" : "submit"} variant="contained" size="large"
          disabled={needsRefresh ? isPending : !canSubmit} onClick={needsRefresh ? onRetry : undefined}
          sx={{ minWidth: { xs: "100%", md: 180 }, display: { xs: floating ? "inline-flex" : "none", md: "inline-flex" } }}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {isPending ? "Сохранение..." : needsRefresh ? "Повторить загрузку" : "Сохранить"}
        </Button>
      </Box>
    </>
  );
};
