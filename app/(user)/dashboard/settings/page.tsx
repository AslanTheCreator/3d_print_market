"use client";

import React, { Suspense } from "react";
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  useTheme,
  useMediaQuery,
  Skeleton,
  Stack,
} from "@mui/material";
import { LocationOn, LocalShipping, Payment, Share } from "@mui/icons-material";
import { useSearchParams, useRouter } from "next/navigation";

import { AddressManagerWidget } from "@/widgets/address-manager-widget";
import { TransferFormWidget } from "@/widgets/transfer";
import { AccountsFormWidget } from "@/widgets/accounts";
import { SocialNetworksFormWidget } from "@/widgets/social-networks";

// ─────────────────────────────────────────────────────────────────────────────
// Tab Configuration
// ─────────────────────────────────────────────────────────────────────────────

const TAB_KEYS = ["address", "shipping", "payment", "contacts"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_TO_INDEX: Record<TabKey, number> = {
  address: 0,
  shipping: 1,
  payment: 2,
  contacts: 3,
};

const INDEX_TO_TAB: Record<number, TabKey> = {
  0: "address",
  1: "shipping",
  2: "payment",
  3: "contacts",
};

const DEFAULT_TAB: TabKey = "address";

// ─────────────────────────────────────────────────────────────────────────────
// TabPanel Component (Lazy mount + keep alive pattern)
// ─────────────────────────────────────────────────────────────────────────────

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

/**
 * TabPanel с паттерном "lazy mount + keep alive":
 * - Виджет монтируется только когда таб впервые становится активным
 * - После монтирования виджет остаётся в DOM, но скрывается через CSS
 * - Это сохраняет состояние форм при переключении между табами
 * - И предотвращает лишние запросы при первой загрузке страницы
 */
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  const isActive = value === index;
  const [hasBeenActive, setHasBeenActive] = React.useState(isActive);

  React.useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  if (!hasBeenActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      hidden={!isActive}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      style={{ display: isActive ? "block" : "none" }}
    >
      <Box sx={{ pt: 3 }}>{children}</Box>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Settings Content (использует useSearchParams)
// ─────────────────────────────────────────────────────────────────────────────

function SettingsContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const router = useRouter();
  const searchParams = useSearchParams();

  // Получаем активный таб из URL
  const tabParam = searchParams.get("tab") as TabKey | null;
  const initialTab =
    tabParam && TAB_KEYS.includes(tabParam)
      ? TAB_TO_INDEX[tabParam]
      : TAB_TO_INDEX[DEFAULT_TAB];

  // Локальное состояние для мгновенного отклика UI
  const [activeTab, setActiveTab] = React.useState(initialTab);

  React.useEffect(() => {
    const urlTab = searchParams.get("tab") as TabKey | null;
    const urlIndex =
      urlTab && TAB_KEYS.includes(urlTab)
        ? TAB_TO_INDEX[urlTab]
        : TAB_TO_INDEX[DEFAULT_TAB];
    setActiveTab(urlIndex);
  }, [searchParams]);

  // Обработчик смены таба — обновляет URL без перезагрузки страницы
  const handleTabChange = (_: React.SyntheticEvent, newIndex: number) => {
    // 1. Мгновенно обновляем UI
    setActiveTab(newIndex);

    // 2. Обновляем URL в фоне (не блокирует UI)
    const newTab = INDEX_TO_TAB[newIndex];
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant={isMobile ? "fullWidth" : "standard"}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          px: { xs: 0, sm: 2 },
        }}
      >
        <Tab
          icon={<LocationOn />}
          iconPosition="start"
          label="Адрес доставки"
          id="settings-tab-0"
          aria-controls="settings-tabpanel-0"
          sx={{
            minHeight: { xs: 56, sm: 64 },
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
          }}
        />
        <Tab
          icon={<LocalShipping />}
          iconPosition="start"
          label="Способ отправки"
          id="settings-tab-1"
          aria-controls="settings-tabpanel-1"
          sx={{
            minHeight: { xs: 56, sm: 64 },
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
          }}
        />
        <Tab
          icon={<Payment />}
          iconPosition="start"
          label="Способ оплаты"
          id="settings-tab-2"
          aria-controls="settings-tabpanel-2"
          sx={{
            minHeight: { xs: 56, sm: 64 },
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
          }}
        />
        <Tab
          icon={<Share />}
          iconPosition="start"
          label="Способы связи"
          id="settings-tab-3"
          aria-controls="settings-tabpanel-3"
          sx={{
            minHeight: { xs: 56, sm: 64 },
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
          }}
        />
      </Tabs>

      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <TabPanel value={activeTab} index={0}>
          <AddressManagerWidget />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <TransferFormWidget />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <AccountsFormWidget />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <SocialNetworksFormWidget />
        </TabPanel>
      </Box>
    </Paper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Loading Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function SettingsLoadingSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* Tabs skeleton */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}
      >
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" width={120} height={40} />
        ))}
      </Stack>

      {/* Content skeleton */}
      <Box sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={56} />
        </Stack>
      </Box>
    </Paper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Page (с Suspense boundary)
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Container
      maxWidth="md"
      sx={{
        py: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <SettingsContent />
      </Suspense>
    </Container>
  );
}
