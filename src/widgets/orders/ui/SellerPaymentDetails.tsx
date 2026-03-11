"use client";
import React from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Skeleton,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  alpha,
} from "@mui/material";
import {
  CreditCard,
  AccountBalance,
  Payments,
  ContentCopy,
  CheckCircle,
} from "@mui/icons-material";
import { AccountsBaseModel, TransferMoney } from "@/shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// Конфигурация способов оплаты
// ─────────────────────────────────────────────────────────────────────────────

const PAYMENT_METHOD_CONFIG: Record<
  TransferMoney,
  { label: string; icon: React.ReactNode; color: string }
> = {
  BANK_CARD: {
    label: "Банковская карта",
    icon: <CreditCard />,
    color: "#1976d2",
  },
  BANK_SBP: {
    label: "СБП",
    icon: <AccountBalance />,
    color: "#4caf50",
  },
  CASH: {
    label: "Наличные",
    icon: <Payments />,
    color: "#ff9800",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

const PaymentDetailsSkeleton = () => (
  <Box sx={{ mb: 3 }}>
    <Skeleton variant="text" width={200} height={24} sx={{ mb: 1.5 }} />
    <Stack spacing={1.5}>
      {[1, 2].map((i) => (
        <Skeleton key={i} variant="rounded" height={56} />
      ))}
    </Stack>
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
// CopyableField — поле с кнопкой копирования
// ─────────────────────────────────────────────────────────────────────────────

interface CopyableFieldProps {
  label: string;
  value: string;
}

const CopyableField: React.FC<CopyableFieldProps> = ({ label, value }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — не критично
    }
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        py: 0.75,
        "&:not(:last-child)": {
          borderBottom: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography
          variant="body2"
          fontWeight={500}
          sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
        >
          {value}
        </Typography>
      </Box>

      <Tooltip title={copied ? "Скопировано!" : "Копировать"}>
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{ ml: 1, flexShrink: 0 }}
        >
          {copied ? (
            <CheckCircle fontSize="small" color="success" />
          ) : (
            <ContentCopy fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AccountCard — карточка одного счёта
// ─────────────────────────────────────────────────────────────────────────────

interface AccountCardProps {
  account: AccountsBaseModel;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  isSelected,
  onSelect,
}) => {
  const config = PAYMENT_METHOD_CONFIG[account.transferMoney] ?? {
    label: account.transferMoney,
    icon: <Payments />,
    color: "#757575",
  };

  return (
    <Paper
      variant="outlined"
      onClick={() => onSelect(account.id)}
      sx={{
        cursor: "pointer",
        overflow: "hidden",
        transition: "all 0.2s ease",
        borderColor: isSelected ? config.color : "divider",
        borderWidth: isSelected ? 2 : 1,
        borderLeftWidth: 3,
        borderLeftColor: config.color,
        "&:hover": {
          borderColor: config.color,
          bgcolor: (theme) => alpha(config.color, 0.02),
        },
      }}
    >
      {/* Заголовок карточки — всегда видимый */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: 2, py: 1.5 }}
      >
        <Box sx={{ color: config.color, display: "flex" }}>{config.icon}</Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600}>
            {config.label}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {account.username}
          </Typography>
        </Box>

        {isSelected && (
          <CheckCircle sx={{ color: config.color, fontSize: 20 }} />
        )}
      </Stack>

      {/* Развёрнутые детали — при выборе */}
      <Collapse in={isSelected}>
        <Box
          sx={{
            px: 2,
            pb: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <CopyableField label="Получатель" value={account.username} />
          <CopyableField label="Реквизиты" value={account.entityValue} />
          {account.comment && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Комментарий от продавца
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {account.comment}
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SellerPaymentDetails — основной компонент
// ─────────────────────────────────────────────────────────────────────────────

interface SellerPaymentDetailsProps {
  accounts: AccountsBaseModel[] | undefined;
  isLoading: boolean;
  isError: boolean;
  selectedAccountId: number | null;
  onSelectAccount: (id: number) => void;
}

export const SellerPaymentDetails: React.FC<SellerPaymentDetailsProps> = ({
  accounts,
  isLoading,
  isError,
  selectedAccountId,
  onSelectAccount,
}) => {
  if (isLoading) {
    return <PaymentDetailsSkeleton />;
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
        Не удалось загрузить реквизиты продавца. Попробуйте обновить страницу.
      </Alert>
    );
  }

  if (!accounts?.length) {
    return (
      <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
        У продавца не указаны реквизиты для оплаты. Свяжитесь с продавцом для
        уточнения способа оплаты.
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Выберите способ оплаты *
      </Typography>

      <Stack spacing={1.5}>
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            isSelected={selectedAccountId === account.id}
            onSelect={onSelectAccount}
          />
        ))}
      </Stack>
    </Box>
  );
};
