import type React from "react";
import Link from "next/link";
import {
  Box,
  Card,
  CardContent,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { ChevronRightRounded } from "@mui/icons-material";

interface DashboardShortcutCardProps {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

export const DashboardShortcutCard = ({
  title,
  subtitle,
  href,
  icon,
  color,
}: DashboardShortcutCardProps): React.ReactElement => {
  const theme = useTheme();

  return (
    <Card
      component={Link}
      href={href}
      sx={{
        display: "block",
        width: "100%",
        height: "100%",
        borderRadius: 2,
        backgroundColor: theme.palette.common.white,
        border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
        textDecoration: "none",
        transition:
          "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: alpha(color, 0.28),
          boxShadow: "0 10px 22px rgba(15, 23, 42, 0.08)",
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          minHeight: { xs: 136, sm: 148, md: 132 },
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: { xs: 44, sm: 48 },
            height: { xs: 44, sm: 48 },
            borderRadius: 2,
            bgcolor: alpha(color, 0.12),
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            "& .MuiSvgIcon-root": {
              fontSize: { xs: 26, sm: 28 },
            },
          }}
        >
          {icon}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box minWidth={0}>
            <Typography
              variant="h5"
              component="h2"
              sx={{
                mb: 0.25,
                fontWeight: 600,
                color: "text.primary",
                fontSize: { xs: "0.98rem", sm: "1.05rem", md: "1.25rem" },
                lineHeight: 1.15,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.76rem", sm: "0.85rem", md: "0.95rem" },
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </Typography>
          </Box>

          <ChevronRightRounded
            sx={{
              color: "text.secondary",
              fontSize: 24,
              flexShrink: 0,
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
