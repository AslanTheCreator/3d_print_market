"use client";

import {
  Box,
  Button,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";

interface ProfileFormHeaderProps {
  onBack: () => void;
}

export const ProfileFormHeader = ({ onBack }: ProfileFormHeaderProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        background: `linear-gradient(135deg, ${alpha(
          theme.palette.primary.main,
          0.05,
        )}, ${alpha(theme.palette.secondary.main, 0.05)})`,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Button
          startIcon={<ArrowBack />}
          onClick={onBack}
          sx={{ minWidth: "auto" }}
        >
          Назад
        </Button>
        <Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.75rem" },
            }}
          >
            Профиль
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};
