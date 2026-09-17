import type { ReactNode } from "react";
import { Alert, Box, Button } from "@mui/material";
import { SettingsPanelSkeleton } from "./SettingsPanelSkeleton";

export const SettingsDataBoundary = ({ children, loading, failed, ready, refreshing, onRetry }: {
  children: ReactNode;
  loading: boolean;
  failed: boolean;
  ready: boolean;
  refreshing: boolean;
  onRetry: () => void;
}) => {
  if (loading && !ready) return <SettingsPanelSkeleton />;
  return (
    <Box>
      {failed && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button color="inherit" disabled={refreshing} onClick={onRetry}>Повторить</Button>
        }>
          Не удалось загрузить настройки. {ready ? "Введённые данные остаются в форме." : "Попробуйте ещё раз."}
        </Alert>
      )}
      {ready && children}
    </Box>
  );
};
