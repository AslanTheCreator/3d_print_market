import React from "react";
import { Typography, Paper, Card, CardContent, Box } from "@mui/material";
import { AddressSelector } from "@/features/address/address-selector/ui/AddressSelector";
import { AddressBaseModel } from "@/entities/address/model/types";

type CheckoutAddressSectionProps = {
  selectedAddressId?: number;
  onAddressSelect: (address: AddressBaseModel | null) => void;
  onAddNewAddress: () => void;
  addresses: AddressBaseModel[];
  isLoading: boolean;
  isMobile?: boolean;
};

export const CheckoutAddressSection: React.FC<CheckoutAddressSectionProps> = ({
  selectedAddressId,
  onAddressSelect,
  onAddNewAddress,
  addresses,
  isLoading,
  isMobile = false,
}) => {
  if (isMobile) {
    return (
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Адрес доставки
          </Typography>
          <AddressSelector
            selectedAddressId={selectedAddressId}
            onAddressSelect={onAddressSelect}
            onAddNewAddress={onAddNewAddress}
            addresses={addresses}
            isLoading={isLoading}
          />
        </Box>
      </Paper>
    );
  }

  // Desktop
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Адрес доставки
        </Typography>
        <AddressSelector
          selectedAddressId={selectedAddressId}
          onAddressSelect={onAddressSelect}
          onAddNewAddress={onAddNewAddress}
          addresses={addresses}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
};
