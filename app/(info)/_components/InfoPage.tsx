import type { ReactNode } from "react";
import { Box, Container, Stack, Typography } from "@mui/material";

interface InfoPageProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function InfoPage({ title, subtitle, children }: InfoPageProps) {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <Stack spacing={{ xs: 3, sm: 4 }}>
        <Box>
          <Typography
            component="h1"
            variant="h2"
            sx={{
              mb: subtitle ? 1.5 : 0,
              fontSize: { xs: "1.875rem", sm: "2.25rem" },
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {children}
      </Stack>
    </Container>
  );
}
