import { useState } from "react";
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Box,
  Skeleton,
} from "@mui/material";
import { AddressBaseModel } from "@/entities/address/model/types";

interface AddressSelectorProps {
  addresses: AddressBaseModel[];
  isLoading: boolean;
  selectedAddressId?: number;
  onAddressSelect: (address: AddressBaseModel) => void;
  onAddNewAddress: () => void;
}

export const AddressSelector = ({
  addresses,
  selectedAddressId,
  onAddressSelect,
  onAddNewAddress,
  isLoading,
}: AddressSelectorProps) => {
  if (isLoading) {
    return (
      <Box>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={60} sx={{ mb: 1 }} />
        ))}
      </Box>
    );
  }

  return (
    <FormControl component="fieldset" fullWidth>
      <FormLabel component="legend">Выберите адрес доставки</FormLabel>
      <RadioGroup
        value={selectedAddressId || ""}
        onChange={(e) => {
          const address = addresses?.find(
            (a) => a.id === Number(e.target.value)
          );
          if (address) onAddressSelect(address);
        }}
      >
        {addresses?.map((address) => (
          <FormControlLabel
            key={address.id}
            value={address.id}
            control={<Radio />}
            label={`${address.country}, ${address.city}, ${address.street} ${address.houseNumber}`}
          />
        ))}
      </RadioGroup>

      <Button
        variant="outlined"
        onClick={onAddNewAddress}
        sx={{ mt: 2, alignSelf: "flex-start" }}
      >
        Добавить новый адрес
      </Button>
    </FormControl>
  );
};
