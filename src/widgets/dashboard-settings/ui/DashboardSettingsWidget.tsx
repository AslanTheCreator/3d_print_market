"use client";

import React, { Suspense } from "react";
import {
  Paper,
  Tabs,
  Tab,
  Box,
  useTheme,
  Skeleton,
} from "@mui/material";
import {
  LocationOn,
  LocalShipping,
  Payment,
  SettingsRounded,
  Share,
} from "@mui/icons-material";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/shared/ui/page-header";
import { AddressManagerWidget } from "./AddressManagerWidget";
import { ShippingMethodsWidget } from "./ShippingMethodsWidget";
import { PaymentAccountsWidget } from "./PaymentAccountsWidget";
import { SocialNetworksFormWidget } from "./SocialNetworksFormWidget";
import { SettingsPanelContext } from "../model/SettingsPanelContext";
import { SettingsPanelSkeleton } from "./SettingsPanelSkeleton";

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

const SETTINGS_TABS: Array<{
  icon: React.ReactElement;
  key: TabKey;
  label: string;
  mobileLabel: string;
}> = [
  {
    key: "address",
    label: "Адрес доставки",
    mobileLabel: "Адреса",
    icon: <LocationOn />,
  },
  {
    key: "shipping",
    label: "Способ отправки",
    mobileLabel: "Доставка",
    icon: <LocalShipping />,
  },
  {
    key: "payment",
    label: "Способ оплаты",
    mobileLabel: "Оплата",
    icon: <Payment />,
  },
  {
    key: "contacts",
    label: "Способы связи",
    mobileLabel: "Связь",
    icon: <Share />,
  },
];

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
  onDirtyChange: (index: number, dirty: boolean) => void;
}

const TabPanel = ({ children, value, index, onDirtyChange }: TabPanelProps) => {
  const isActive = value === index;
  const [hasBeenActive, setHasBeenActive] = React.useState(isActive);

  React.useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  const reportDirty = React.useCallback((dirty: boolean) => onDirtyChange(index, dirty), [index, onDirtyChange]);
  const panelState = React.useMemo(() => ({ active: isActive, reportDirty }), [isActive, reportDirty]);

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
      <SettingsPanelContext.Provider value={panelState}>
        <Box sx={{ pt: { xs: 0, md: 3 } }}>{children}</Box>
      </SettingsPanelContext.Provider>
    </div>
  );
};

function SettingsContent() {
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabKey | null;
  const initialTab =
    tabParam && TAB_KEYS.includes(tabParam)
      ? TAB_TO_INDEX[tabParam]
      : TAB_TO_INDEX[DEFAULT_TAB];
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [dirtyTabs, setDirtyTabs] = React.useState<Record<number, boolean>>({});
  const onDirtyChange = React.useCallback((index: number, dirty: boolean) => {
    setDirtyTabs((previous) => previous[index] === dirty ? previous : { ...previous, [index]: dirty });
  }, []);
  const hasDraft = Object.values(dirtyTabs).some(Boolean);
  React.useEffect(() => {
    if (!hasDraft) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasDraft]);

  React.useEffect(() => {
    const urlTab = searchParams.get("tab") as TabKey | null;
    const urlIndex =
      urlTab && TAB_KEYS.includes(urlTab)
        ? TAB_TO_INDEX[urlTab]
        : TAB_TO_INDEX[DEFAULT_TAB];
    setActiveTab(urlIndex);
  }, [searchParams]);

  const handleTabChange = (_: React.SyntheticEvent, newIndex: number) => {
    setActiveTab(newIndex);

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
        border: { xs: "none", md: `1px solid ${theme.palette.divider}` },
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          minHeight: { xs: 48, md: 64 },
          px: { xs: 0, md: 2 },
          py: 0,
          "& .MuiTabs-flexContainer": {
            gap: 0,
            justifyContent: "flex-start",
          },
          "& .MuiTabs-indicator": {
            display: { xs: "none", md: "block" },
            height: 3,
            borderRadius: "3px 3px 0 0",
          },
          "& .MuiTabs-scrollButtons": {
            width: 44,
            minWidth: 44,
            minHeight: 44,
            display: "none",
            "&.Mui-disabled": {
              opacity: 0.2,
            },
          },
        }}
      >
        {SETTINGS_TABS.map((tab, index) => (
          <Tab
            key={tab.key}
            icon={tab.icon}
            iconPosition="start"
            label={
              <Box component="span">
                <Box
                  component="span"
                  sx={{ display: { xs: "inline", md: "none" } }}
                >
                  {tab.mobileLabel}{dirtyTabs[index] && <Box component="span" aria-label="Есть несохранённые изменения"> •</Box>}
                </Box>
                <Box
                  component="span"
                  sx={{ display: { xs: "none", md: "inline" } }}
                >
                  {tab.label}{dirtyTabs[index] && <Box component="span" aria-label="Есть несохранённые изменения"> •</Box>}
                </Box>
              </Box>
            }
            id={`settings-tab-${index}`}
            aria-controls={`settings-tabpanel-${index}`}
            sx={{
              minHeight: { xs: 44, md: 64 },
              minWidth: { xs: 0, md: 160 },
              flex: { xs: 1, md: "0 0 auto" },
              maxWidth: "none",
              flexShrink: 0,
              px: { xs: 0.5, md: 2 },
              py: { xs: 0.75, md: 1.5 },
              borderRadius: { xs: 1.5, md: 0 },
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "none",
              color: "text.secondary",
              "& .MuiTab-iconWrapper": {
                display: { xs: "none", md: "inline-flex" },
                mr: 0.75,
                fontSize: { xs: 19, md: 22 },
              },
              "&.Mui-selected": {
                fontWeight: 700,
                color: { xs: "primary.contrastText", md: "primary.main" },
                bgcolor: { xs: "primary.main", md: "transparent" },
                boxShadow: {
                  xs: "none",
                  md: "none",
                },
              },
            }}
          />
        ))}
      </Tabs>

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <TabPanel onDirtyChange={onDirtyChange} value={activeTab} index={0}>
          <AddressManagerWidget />
        </TabPanel>
        <TabPanel onDirtyChange={onDirtyChange} value={activeTab} index={1}>
          <ShippingMethodsWidget />
        </TabPanel>
        <TabPanel onDirtyChange={onDirtyChange} value={activeTab} index={2}>
          <PaymentAccountsWidget />
        </TabPanel>
        <TabPanel onDirtyChange={onDirtyChange} value={activeTab} index={3}>
          <SocialNetworksFormWidget />
        </TabPanel>
      </Box>
    </Paper>
  );
}

function SettingsLoadingSkeleton() {
  return (
    <Paper
      aria-busy="true"
      elevation={0}
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Tabs
        value={false}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          minHeight: { xs: 48, md: 64 },
          px: { xs: 0, md: 2 },
          py: 0,
          "& .MuiTabs-flexContainer": {
            gap: 0,
          },
          "& .MuiTabs-scrollButtons": {
            width: 44,
            minWidth: 44,
            minHeight: 44,
            display: "none",
          },
        }}
      >
        {SETTINGS_TABS.map((tab) => (
          <Tab
            key={tab.key}
            disabled
            icon={<Box sx={{ display: { xs: "none", md: "block" } }}><Skeleton variant="circular" width={22} height={22} /></Box>}
            iconPosition="start"
            label={<Skeleton variant="text" sx={{ width: { xs: 48, md: 72 } }} height={20} />}
            sx={{
              minHeight: { xs: 44, md: 64 },
              minWidth: { xs: 0, md: 160 },
              flex: { xs: 1, md: "0 0 auto" },
              flexShrink: 0,
              px: { xs: 0.5, md: 2 },
              py: { xs: 0.75, md: 1.5 },
              opacity: 1,
            }}
          />
        ))}
      </Tabs>

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ pt: { xs: 0, md: 3 } }}>
          <SettingsPanelSkeleton />
        </Box>
      </Box>
    </Paper>
  );
}

export const DashboardSettingsWidget = () => {
  return (
    <Box
      sx={{
        width: "100%",
        py: { xs: 0, md: 3 },
      }}
    >
      <Box sx={{ display: { xs: "none", md: "block" } }}><PageHeader
        title="Доставка и оплата"
        icon={<SettingsRounded />}
      /></Box>

      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <SettingsContent />
      </Suspense>
    </Box>
  );
};
