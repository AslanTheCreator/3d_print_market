import type React from "react";
import { Box, LinearProgress, Stack, Typography, alpha, useTheme } from "@mui/material";
import { CheckCircleRounded, WarningAmberRounded } from "@mui/icons-material";
import type { ProfileTask } from "./model";

interface ProfileProgressProps {
  tasks: readonly ProfileTask[];
  completion: number;
}

export const ProfileProgress = ({
  tasks,
  completion,
}: ProfileProgressProps): React.ReactElement => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        flex: "1 1 32%",
        minWidth: 0,
        p: { xs: 1.25, sm: 0 },
        borderRadius: { xs: 1.5, sm: 0 },
        bgcolor: {
          xs: alpha(theme.palette.primary.main, 0.05),
          sm: "transparent",
        },
        border: {
          xs: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
          sm: "none",
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Typography variant="body2" color="text.secondary">
          Заполненность профиля
        </Typography>
        <Typography variant="body2" fontWeight={800} color="primary.main">
          {completion}%
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={completion}
        sx={{
          height: { xs: 6, sm: 7 },
          borderRadius: 999,
          mb: { xs: 1.25, sm: 2 },
          bgcolor: alpha(theme.palette.primary.main, 0.12),
        }}
      />

      <Stack spacing={{ xs: 0.75, sm: 1 }}>
        {tasks.map((task) => (
          <Stack
            key={task.label}
            direction="row"
            spacing={1}
            alignItems="center"
          >
            {task.completed ? (
              <CheckCircleRounded
                sx={{ color: "success.main", fontSize: { xs: 18, sm: 20 } }}
              />
            ) : (
              <WarningAmberRounded
                sx={{ color: "warning.main", fontSize: { xs: 18, sm: 20 } }}
              />
            )}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.76rem", sm: "0.875rem" } }}
            >
              {task.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};
