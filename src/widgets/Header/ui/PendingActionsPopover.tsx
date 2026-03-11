"use client";

import React from "react";
import {
  Popover,
  Box,
  Typography,
  Stack,
  Divider,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
  Button,
} from "@mui/material";
import {
  Storefront,
  Receipt,
  Update,
  CheckCircleOutline,
} from "@mui/icons-material";
import Link from "next/link";
import { PendingActionGroup } from "../model/pendingActions";

interface PendingActionsPopoverProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  sellerActionGroups: PendingActionGroup[];
  customerActionGroups: PendingActionGroup[];
  renewalGroup: PendingActionGroup | null;
  totalCount: number;
  isLoading: boolean;
}

export const PendingActionsPopover: React.FC<PendingActionsPopoverProps> = ({
  anchorEl,
  open,
  onClose,
  sellerActionGroups,
  customerActionGroups,
  renewalGroup,
  totalCount,
  isLoading,
}) => {
  const theme = useTheme();

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      slotProps={{
        paper: {
          sx: {
            mt: 1.5,
            borderRadius: 2,
            minWidth: 280,
            maxWidth: 340,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
            border: `1px solid ${theme.palette.divider}`,
          },
        },
      }}
    >
      {/* Заголовок */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Требуют внимания
        </Typography>
        {totalCount > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {totalCount}{" "}
            {getDeclension(totalCount, ["действие", "действия", "действий"])}
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Контент */}
      <Box sx={{ py: 1 }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : totalCount === 0 ? (
          <EmptyState />
        ) : (
          <Stack spacing={0}>
            {/* Продажи */}
            {sellerActionGroups.length > 0 && (
              <ActionSection
                title="Продажи"
                icon={<Storefront sx={{ fontSize: 16 }} />}
                groups={sellerActionGroups}
                onClose={onClose}
              />
            )}

            {/* Покупки */}
            {customerActionGroups.length > 0 && (
              <>
                {sellerActionGroups.length > 0 && <Divider sx={{ mx: 2 }} />}
                <ActionSection
                  title="Покупки"
                  icon={<Receipt sx={{ fontSize: 16 }} />}
                  groups={customerActionGroups}
                  onClose={onClose}
                />
              </>
            )}

            {/* Продление товаров */}
            {renewalGroup && (
              <>
                {(sellerActionGroups.length > 0 ||
                  customerActionGroups.length > 0) && (
                  <Divider sx={{ mx: 2 }} />
                )}
                <ActionSection
                  title="Мои товары"
                  icon={<Update sx={{ fontSize: 16 }} />}
                  groups={[renewalGroup]}
                  onClose={onClose}
                />
              </>
            )}
          </Stack>
        )}
      </Box>

      {/* Футер */}
      {totalCount > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 1.5 }}>
            <Button
              component={Link}
              href="/dashboard"
              fullWidth
              size="small"
              variant="text"
              onClick={onClose}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Перейти в личный кабинет
            </Button>
          </Box>
        </>
      )}
    </Popover>
  );
};

// --- Вспомогательные компоненты ---

interface ActionSectionProps {
  title: string;
  icon: React.ReactNode;
  groups: PendingActionGroup[];
  onClose: () => void;
}

const ActionSection: React.FC<ActionSectionProps> = ({
  title,
  icon,
  groups,
  onClose,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ py: 1 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{ px: 2.5, pb: 0.75 }}
      >
        <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>
        <Typography
          variant="caption"
          fontWeight={600}
          color="text.secondary"
          textTransform="uppercase"
          letterSpacing={0.5}
        >
          {title}
        </Typography>
      </Stack>

      {groups.map((group) => {
        const IconComponent = group.icon;

        return (
          <Box
            key={group.type}
            component={Link}
            href={group.href}
            onClick={onClose}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2.5,
              py: 1,
              textDecoration: "none",
              color: "text.primary",
              transition: theme.transitions.create("background-color", {
                duration: theme.transitions.duration.shorter,
              }),
              "&:hover": {
                bgcolor: alpha(theme.palette.action.hover, 0.06),
              },
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: alpha(group.color, 0.1),
                flexShrink: 0,
              }}
            >
              <IconComponent sx={{ fontSize: 18, color: group.color }} />
            </Box>

            <Typography variant="body2" sx={{ flex: 1 }}>
              {group.label}
            </Typography>

            <Chip
              label={group.count}
              size="small"
              sx={{
                height: 22,
                minWidth: 22,
                fontWeight: 700,
                fontSize: "0.75rem",
                bgcolor: alpha(group.color, 0.12),
                color: group.color,
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
};

const EmptyState: React.FC = () => (
  <Box sx={{ textAlign: "center", py: 3, px: 2 }}>
    <CheckCircleOutline
      sx={{ fontSize: 40, color: "success.main", opacity: 0.6, mb: 1 }}
    />
    <Typography variant="body2" color="text.secondary">
      Нет действий, требующих внимания
    </Typography>
  </Box>
);

// --- Утилиты ---

function getDeclension(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;

  if (abs > 10 && abs < 20) return forms[2];
  if (lastDigit > 1 && lastDigit < 5) return forms[1];
  if (lastDigit === 1) return forms[0];
  return forms[2];
}
