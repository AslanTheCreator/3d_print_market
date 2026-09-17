"use client";

import React from "react";
import { Box, Alert, AlertTitle, Card, CardContent } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { AddressManager } from "./AddressManager";

export const AddressManagerWidget: React.FC = () => {
  return (
    <Box>
      {/* Инфо */}
      <Alert
        severity="info"
        icon={<InfoOutlined />}
        sx={{
          display: { xs: "none", md: "flex" },
          mb: 3,
          borderRadius: 2,
          "& .MuiAlert-message": {
            fontSize: { xs: "0.813rem", sm: "0.875rem" },
          },
        }}
      >
        <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>
          Адрес доставки
        </AlertTitle>
        Добавляйте и управляйте адресами доставки.
      </Alert>

      {/* Контейнер с адресами */}
      <Card
        elevation={0}
        sx={{
          border: { xs: "none", md: "1px solid" },
          borderColor: "divider",
          boxShadow: "none",
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: { xs: 0, md: 3 }, "&:last-child": { pb: { xs: 0, md: 3 } } }}>
          <AddressManager />
        </CardContent>
      </Card>
    </Box>
  );
};
