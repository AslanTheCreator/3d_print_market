"use client";

import React, { useState } from "react";
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { LocationOn, LocalShipping } from "@mui/icons-material";
import { AddressFormWidget } from "@/entities/transfer/ui/AddressFormWidget";
import { ShippingMethodWidget } from "@/entities/transfer/ui/TransferFormWidget";

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
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const showSuccess = (message: string) => {
    setSnackbar({ open: true, message, severity: "success" });
  };

  const showError = (message: string) => {
    setSnackbar({ open: true, message, severity: "error" });
  };

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
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <TabPanel value={activeTab} index={0}>
            <AddressFormWidget
              onSuccess={() => showSuccess("Адрес успешно сохранен")}
              onError={(error) => showError(error)}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <ShippingMethodWidget
              onSuccess={() => showSuccess("Способ отправки сохранен")}
              onError={(error) => showError(error)}
            />
          </TabPanel>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
