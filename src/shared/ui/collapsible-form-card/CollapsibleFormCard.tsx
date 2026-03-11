"use client";

import React, { ReactNode } from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Collapse,
  useTheme,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";

interface CollapsibleFormCardProps {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  isEnabled: boolean;
  isExpanded: boolean;
  onEnabledChange: (checked: boolean) => void;
  onToggleExpand: () => void;
  children?: ReactNode;
  badge?: ReactNode;
  showExpandIcon?: boolean;
}

export const CollapsibleFormCard: React.FC<CollapsibleFormCardProps> = ({
  value,
  label,
  description,
  icon,
  isEnabled,
  isExpanded,
  onEnabledChange,
  onToggleExpand,
  children,
  badge,
  showExpandIcon = true,
}) => {
  const theme = useTheme();

  const handleCardClick = () => {
    if (isEnabled && children) {
      onToggleExpand();
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const checked = e.target.checked;
    onEnabledChange(checked);

    // Expand automatically when the item gets enabled.
    if (checked && children && !isExpanded) {
      onToggleExpand();
    }
  };

  return (
    <Card
      sx={{
        transition: "all 0.2s",
        border: `2px solid ${
          isEnabled ? theme.palette.primary.main : theme.palette.divider
        }`,
        boxShadow: isEnabled
          ? `0 0 0 1px ${theme.palette.primary.main}`
          : "none",
        "&:hover": {
          borderColor: theme.palette.primary.light,
          boxShadow: `0 2px 8px ${theme.palette.action.hover}`,
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          "&:last-child": { pb: { xs: 2, sm: 2.5 } },
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          sx={{ cursor: children ? "pointer" : "default" }}
          onClick={handleCardClick}
        >
          <Box display="flex" alignItems="center" gap={2} flex={1}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isEnabled}
                  onChange={handleCheckboxChange}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              label=""
              sx={{ m: 0 }}
            />

            {icon && (
              <Box
                sx={{
                  color: isEnabled ? "primary.main" : "action.active",
                  display: { xs: "none", sm: "flex" },
                }}
              >
                {icon}
              </Box>
            )}

            <Box flex={1}>
              <Typography
                variant="body1"
                fontWeight={isEnabled ? 600 : 500}
                sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
              >
                {label}
              </Typography>
              {description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, mt: 0.5 }}
                >
                  {description}
                </Typography>
              )}
            </Box>

            {badge && <Box sx={{ ml: 2 }}>{badge}</Box>}
          </Box>

          {isEnabled && children && showExpandIcon && (
            <Box sx={{ ml: 1 }}>
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </Box>
          )}
        </Box>

        {children && (
          <Collapse in={isEnabled && isExpanded} timeout="auto">
            <Box sx={{ mt: 3, pl: { xs: 0, sm: 7 } }}>{children}</Box>
          </Collapse>
        )}
      </CardContent>
    </Card>
  );
};
