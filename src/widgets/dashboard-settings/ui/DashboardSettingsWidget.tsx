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
    mobileLabel: "Адрес",
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
}

const TabPanel = ({ children, value, index }: TabPanelProps) => {
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
      <Box sx={{ pt: { xs: 2, sm: 3 } }}>{children}</Box>
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
        border: `1px solid ${theme.palette.divider}`,
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
          minHeight: { xs: 60, sm: 64 },
          px: { xs: 1, sm: 2 },
          py: { xs: 1, sm: 0 },
          "& .MuiTabs-flexContainer": {
            gap: { xs: 1, sm: 0 },
            justifyContent: "flex-start",
          },
          "& .MuiTabs-indicator": {
            display: { xs: "none", sm: "block" },
            height: 3,
            borderRadius: "3px 3px 0 0",
          },
          "& .MuiTabs-scrollButtons": {
            width: 44,
            minWidth: 44,
            minHeight: 44,
            display: { xs: "inline-flex", sm: "none" },
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
                  sx={{ display: { xs: "inline", sm: "none" } }}
                >
                  {tab.mobileLabel}
                </Box>
                <Box
                  component="span"
                  sx={{ display: { xs: "none", sm: "inline" } }}
                >
                  {tab.label}
                </Box>
              </Box>
            }
            id={`settings-tab-${index}`}
            aria-controls={`settings-tabpanel-${index}`}
            sx={{
              minHeight: { xs: 44, sm: 64 },
              minWidth: { xs: "auto", sm: 160 },
              flexShrink: 0,
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1.5 },
              borderRadius: { xs: 1.5, sm: 0 },
              fontSize: { xs: "0.813rem", sm: "0.875rem" },
              fontWeight: 500,
              textTransform: "none",
              color: "text.secondary",
              "& .MuiTab-iconWrapper": {
                mr: 0.75,
                fontSize: { xs: 19, sm: 22 },
              },
              "&.Mui-selected": {
                fontWeight: 700,
                color: { xs: "primary.contrastText", sm: "primary.main" },
                bgcolor: { xs: "primary.main", sm: "transparent" },
                boxShadow: {
                  xs: "0 6px 14px rgba(239, 66, 132, 0.22)",
                  sm: "none",
                },
              },
            }}
          />
        ))}
      </Tabs>

      <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
        <TabPanel value={activeTab} index={0}>
          <AddressManagerWidget />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <ShippingMethodsWidget />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <PaymentAccountsWidget />
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
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
          minHeight: { xs: 60, sm: 64 },
          px: { xs: 1, sm: 2 },
          py: { xs: 1, sm: 0 },
          "& .MuiTabs-flexContainer": {
            gap: { xs: 1, sm: 0 },
          },
          "& .MuiTabs-scrollButtons": {
            width: 44,
            minWidth: 44,
            minHeight: 44,
            display: { xs: "inline-flex", sm: "none" },
          },
        }}
      >
        {SETTINGS_TABS.map((tab) => (
          <Tab
            key={tab.key}
            disabled
            icon={<Skeleton variant="circular" width={22} height={22} />}
            iconPosition="start"
            label={<Skeleton variant="text" width={72} height={20} />}
            sx={{
              minHeight: { xs: 44, sm: 64 },
              minWidth: { xs: 112, sm: 160 },
              flexShrink: 0,
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1.5 },
              opacity: 1,
            }}
          />
        ))}
      </Tabs>

      <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
        <Box sx={{ pt: { xs: 2, sm: 3 } }}>
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
        py: { xs: 2, sm: 3 },
      }}
    >
      <PageHeader
        title="Доставка и оплата"
        icon={<SettingsRounded />}
      />

      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <SettingsContent />
      </Suspense>
    </Box>
  );
};
