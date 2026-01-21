"use client";

import React, { useState } from "react";
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from "@mui/material";
import { LocationOn, LocalShipping, Payment, Share } from "@mui/icons-material";

import { useNotification } from "@/app/providers";
import { AddressManagerWidget } from "@/widgets/address-manager-widget";
import { TransferFormWidget } from "@/widgets/transfer";
import { AccountsFormWidget } from "@/widgets/accounts";
import { SocialNetworksFormWidget } from "@/widgets/social-networks/ui/SocialNetworksFormWidget";

import { useUserTransfers } from "@/entities/transfer";
import { useUserAccounts } from "@/entities/accounts";
import { useUserSocialNetworks } from "@/entities/social-networks";
import { useUserAddresses } from "@/entities/address/hooks";
import { useDictionary } from "@/entities/dictionary";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`transfer-tabpanel-${index}`}
      aria-labelledby={`transfer-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

export default function SettingsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [activeTab, setActiveTab] = useState(0);
  const { showNotification } = useNotification();

  const { isLoading: addressesLoading } = useUserAddresses();
  const { isLoading: transfersLoading } = useUserTransfers();
  const { isLoading: accountsLoading } = useUserAccounts();
  const { isLoading: socialNetworksLoading } = useUserSocialNetworks();

  const { isLoading: shoppingMethodsLoading } =
    useDictionary("SHOPPING_METHODS");
  const { isLoading: currencyLoading } = useDictionary("CURRENCY");
  const { isLoading: transferMoneyLoading } = useDictionary("TRANSFER_MONEY");
  const { isLoading: socialNetworkLoading } = useDictionary("SOCIAL_NETWORK");

  const isLoading =
    addressesLoading ||
    transfersLoading ||
    accountsLoading ||
    socialNetworksLoading ||
    shoppingMethodsLoading ||
    currencyLoading ||
    transferMoneyLoading ||
    socialNetworkLoading;

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (isLoading) {
    return (
      <Container
        maxWidth="md"
        sx={{
          py: { xs: 2, sm: 4 },
          px: { xs: 2, sm: 3 },
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container
      maxWidth="md"
      sx={{
        py: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
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
            id="transfer-tab-0"
            aria-controls="transfer-tabpanel-0"
            sx={{
              minHeight: { xs: 56, sm: 64 },
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            }}
          />
          <Tab
            icon={<LocalShipping />}
            iconPosition="start"
            label="Способ отправки"
            id="transfer-tab-1"
            aria-controls="transfer-tabpanel-1"
            sx={{
              minHeight: { xs: 56, sm: 64 },
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            }}
          />
          <Tab
            icon={<Payment />}
            iconPosition="start"
            label="Способ оплаты"
            id="transfer-tab-2"
            aria-controls="transfer-tabpanel-2"
            sx={{
              minHeight: { xs: 56, sm: 64 },
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            }}
          />
          <Tab
            icon={<Share />}
            iconPosition="start"
            label="Способы связи"
            id="transfer-tab-3"
            aria-controls="transfer-tabpanel-3"
            sx={{
              minHeight: { xs: 56, sm: 64 },
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            }}
          />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <TabPanel value={activeTab} index={0}>
            <AddressManagerWidget
              onSuccess={() =>
                showNotification("Адрес успешно добавлен!", "success")
              }
              onError={() =>
                showNotification(
                  "Не удалось добавить адрес. Попробуйте снова.",
                  "error"
                )
              }
            />
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
    </Container>
  );
}
