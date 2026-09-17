"use client";

import React, { ReactNode, useId } from "react";
import {
  Card,
  CardContent,
  Box,
  ButtonBase,
  Typography,
  Collapse,
  Switch,
  alpha,
  useTheme,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";

interface CollapsibleFormCardProps {
  value: string;
  label: string;
  mobileLabel?: string;
  disabled?: boolean;
  notice?: string;
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
  mobileLabel,
  disabled = false,
  notice,
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
  const panelId = useId();
  const hasChildren = Boolean(children);
  const isPanelExpanded = isEnabled && isExpanded;

  const handleCardClick = () => {
    if (isEnabled && hasChildren) {
      onToggleExpand();
    }
  };

  const handleEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const checked = e.target.checked;
    onEnabledChange(checked);

    // Expand automatically when the item gets enabled.
    if (checked && hasChildren && !isExpanded) {
      onToggleExpand();
    }
  };

  const cardDetails = (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: { xs: 1, md: 2 },
        flex: 1,
        minWidth: 0,
      }}
    >
      {icon && (
        <Box
          aria-hidden="true"
          sx={{
            width: { xs: 24, md: 40 },
            height: { xs: 44, md: 40 },
            borderRadius: 1.5,
            bgcolor: { xs: "transparent", md: isEnabled ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.text.primary, 0.06) },
            color: isEnabled ? "primary.main" : "action.active",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            "& .MuiSvgIcon-root": {
              fontSize: { xs: 20, md: 22 },
            },
          }}
        >
          {icon}
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body1"
          fontWeight={isEnabled ? 600 : 500}
          sx={{
            fontSize: "1rem",
            lineHeight: 1.25,
            overflowWrap: "anywhere",
          }}
        >
          {mobileLabel ? <>
            <Box component="span" sx={{ display: { xs: "inline", md: "none" } }}>{mobileLabel}</Box>
            <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>{label}</Box>
          </> : label}
        </Typography>
        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: { xs: "none", md: "block" }, fontSize: "0.875rem", mt: 0.5 }}
          >
            {description}
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <Card
      sx={{
        transition: "all 0.2s",
        border: `1px solid ${
          isEnabled ? theme.palette.primary.main : theme.palette.divider
        }`,
        boxShadow: { xs: "none", md: isEnabled ? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.18)}` : "none" },
        borderRadius: 2,
        "@media (hover: hover)": {
          "&:hover": {
            borderColor: theme.palette.primary.light,
            boxShadow: `0 2px 8px ${theme.palette.action.hover}`,
          },
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.5, md: 2.5 },
          "&:last-child": { pb: { xs: 1.5, md: 2.5 } },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: { xs: 1.25, md: 2 },
          }}
        >
          {hasChildren ? (
            <ButtonBase
              type="button"
              onClick={handleCardClick}
              disabled={disabled || !isEnabled}
              aria-expanded={isPanelExpanded}
              aria-controls={panelId}
              aria-label={`${
                isPanelExpanded ? "Свернуть" : "Развернуть"
              } раздел «${label}»`}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: { xs: 0.5, md: 1 },
                flex: 1,
                minWidth: 0,
                minHeight: 44,
                p: 0,
                borderRadius: 1,
                textAlign: "left",
                "&.Mui-focusVisible": {
                  outline: `3px solid ${alpha(
                    theme.palette.primary.main,
                    0.35,
                  )}`,
                  outlineOffset: 3,
                },
              }}
            >
              {cardDetails}
              {showExpandIcon && (
                <Box
                  aria-hidden="true"
                  sx={{
                    minWidth: { xs: 24, md: 44 },
                    minHeight: 44,
                    color: isEnabled ? "text.secondary" : "action.disabled",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {isPanelExpanded ? <ExpandLess /> : <ExpandMore />}
                </Box>
              )}
            </ButtonBase>
          ) : (
            cardDetails
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.25, md: 1 },
              flexShrink: 0,
            }}
          >
            {badge && (
              <Box
                sx={{
                  display: { xs: "none", md: "flex" },
                  maxWidth: 190,
                  "& .MuiChip-root": {
                    maxWidth: "100%",
                  },
                  "& .MuiChip-label": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                }}
              >
                {badge}
              </Box>
            )}

            <Switch
              disabled={disabled}
              checked={isEnabled}
              onChange={handleEnabledChange}
              onClick={(e) => e.stopPropagation()}
              size="small"
              sx={{
                width: 58,
                height: 44,
                p: "12px",
                "& .MuiSwitch-switchBase": {
                  width: 44,
                  height: 44,
                  p: "14px",
                  "&.Mui-checked": { transform: "translateX(14px)" },
                },
                "& .MuiSwitch-input": { left: 0, width: "100%", height: "100%" },
                "& .MuiSwitch-track": { borderRadius: 10 },
              }}
              inputProps={{
                "aria-label": `${
                  isEnabled ? "Выключить" : "Включить"
                } раздел «${label}»`,
              }}
            />
          </Box>
        </Box>

        {badge && (
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              mt: 0.9,
              maxWidth: "100%",
              "& .MuiChip-root": {
                maxWidth: "100%",
              },
              "& .MuiChip-label": {
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
          >
            {badge}
          </Box>
        )}

        {notice && <Typography color="warning.main" variant="body2" sx={{ mt: 1 }}>{notice}</Typography>}

        {hasChildren && (
          <Collapse
            id={panelId}
            in={isPanelExpanded}
            timeout="auto"
          >
            <Box sx={{ mt: { xs: 2, md: 3 }, pl: { xs: 0, md: 7 } }}>
              {children}
            </Box>
          </Collapse>
        )}
      </CardContent>
    </Card>
  );
};
