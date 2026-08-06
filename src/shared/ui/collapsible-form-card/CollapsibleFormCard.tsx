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
        gap: { xs: 1.25, sm: 2 },
        flex: 1,
        minWidth: 0,
      }}
    >
      {icon && (
        <Box
          aria-hidden="true"
          sx={{
            width: { xs: 34, sm: 40 },
            height: { xs: 34, sm: 40 },
            borderRadius: 1.5,
            bgcolor: isEnabled
              ? alpha(theme.palette.primary.main, 0.1)
              : alpha(theme.palette.text.primary, 0.06),
            color: isEnabled ? "primary.main" : "action.active",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            "& .MuiSvgIcon-root": {
              fontSize: { xs: 20, sm: 22 },
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
            fontSize: { xs: "0.938rem", sm: "1rem" },
            lineHeight: 1.25,
            overflowWrap: "anywhere",
          }}
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
    </Box>
  );

  return (
    <Card
      sx={{
        transition: "all 0.2s",
        border: `1px solid ${
          isEnabled ? theme.palette.primary.main : theme.palette.divider
        }`,
        boxShadow: isEnabled
          ? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.18)}`
          : "none",
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
          p: { xs: 2, sm: 2.5 },
          "&:last-child": { pb: { xs: 2, sm: 2.5 } },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: { xs: 1.25, sm: 2 },
          }}
        >
          {hasChildren ? (
            <ButtonBase
              type="button"
              onClick={handleCardClick}
              disabled={!isEnabled}
              aria-expanded={isPanelExpanded}
              aria-controls={panelId}
              aria-label={`${
                isPanelExpanded ? "Свернуть" : "Развернуть"
              } раздел «${label}»`}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: { xs: 0.5, sm: 1 },
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
                    minWidth: 44,
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
              gap: { xs: 0.25, sm: 1 },
              flexShrink: 0,
            }}
          >
            {badge && (
              <Box
                sx={{
                  display: { xs: "none", sm: "flex" },
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
              checked={isEnabled}
              onChange={handleEnabledChange}
              onClick={(e) => e.stopPropagation()}
              size="small"
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
              display: { xs: "flex", sm: "none" },
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

        {hasChildren && (
          <Collapse
            id={panelId}
            in={isPanelExpanded}
            timeout="auto"
          >
            <Box sx={{ mt: { xs: 2, sm: 3 }, pl: { xs: 0, sm: 7 } }}>
              {children}
            </Box>
          </Collapse>
        )}
      </CardContent>
    </Card>
  );
};
