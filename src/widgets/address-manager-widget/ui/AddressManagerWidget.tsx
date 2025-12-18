"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Typography,
  Divider,
  Button,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";

import {
  useCreateAddress,
  useUserAddresses,
  useDeleteAddress,
} from "@/entities/address/hooks";
import {
  AddressFormData,
  AddressBaseModel,
} from "@/entities/address/model/types";
import { AddressForm, AddressSelector } from "@/entities/address";
import { useNotification } from "@/app/providers";

interface AddressManagerWidgetProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
  initialData?: Partial<AddressFormData>;
}

type ViewMode = "list" | "add";

export const AddressManagerWidget: React.FC<AddressManagerWidgetProps> = ({
  onSuccess,
  onError,
}) => {
  const { mutateAsync: createAddress, isPending: isCreating } =
    useCreateAddress();
  const { mutateAsync: deleteAddress, isPending: isDeleting } =
    useDeleteAddress();
  const {
    data: addresses = [],
    isLoading: isLoadingAddresses,
    refetch,
  } = useUserAddresses();
  const { showNotification } = useNotification();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedAddress, setSelectedAddress] =
    useState<AddressBaseModel | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] =
    useState<AddressBaseModel | null>(null);

  // Автовыбор первого адреса
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, selectedAddress]);

  const handleSubmit = async (data: AddressFormData) => {
    try {
      await createAddress(data);
      setViewMode("list");
      refetch();
      onSuccess?.();
    } catch (error) {
      const message = "Не удалось добавить адрес. Попробуйте снова.";
      onError?.(message);
    }
  };

  const handleCancel = () => {
    setViewMode("list");
  };

  const handleAddNewAddress = () => {
    setViewMode("add");
  };

  const handleAddressSelect = (address: AddressBaseModel) => {
    setSelectedAddress(address);
  };

  const openDeleteDialog = (address: AddressBaseModel) => {
    setAddressToDelete(address);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setAddressToDelete(null);
  };

  const confirmDelete = async () => {
    if (!addressToDelete) return;

    try {
      await deleteAddress(addressToDelete.id);
      showNotification("Адрес удалён", "success");
      refetch();

      // Если удалили выбранный — выберем первый из оставшихся
      if (selectedAddress?.id === addressToDelete.id) {
        const remaining = addresses.filter((a) => a.id !== addressToDelete.id);
        setSelectedAddress(remaining[0] || null);
      }

      closeDeleteDialog();
    } catch (error) {
      showNotification("Не удалось удалить адрес", "error");
    }
  };

  const hasAddresses = addresses.length > 0;

  return (
    <Box>
      {/* Инфо */}
      <Alert
        severity="info"
        icon={<InfoOutlined />}
        sx={{
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
        {hasAddresses
          ? "Выберите адрес для доставки или добавьте новый."
          : "Добавьте адрес для доставки товаров."}
      </Alert>

      {/* Контейнер с адресами */}
      <Card
        elevation={0}
        sx={{
          border: (t) => `1px solid ${t.palette.divider}`,
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            {viewMode === "add" ? "Добавить новый адрес" : "Мои адреса"}
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {/* Режим списка */}
          <Collapse in={viewMode === "list"}>
            <AddressSelector
              addresses={addresses}
              isLoading={isLoadingAddresses}
              selectedAddressId={selectedAddress?.id}
              onAddressSelect={handleAddressSelect}
              onAddNewAddress={handleAddNewAddress}
            />
          </Collapse>

          {/* Режим добавления */}
          <Collapse in={viewMode === "add"}>
            <AddressForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isCreating}
              submitButtonText="Добавить адрес"
              title=""
            />
          </Collapse>
        </CardContent>
      </Card>

      {/* Диалог подтверждения удаления */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Удалить адрес?</DialogTitle>
        <DialogContent>
          <Typography>
            {addressToDelete &&
              `${addressToDelete.city}, ${addressToDelete.street} ${addressToDelete.houseNumber}`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Отмена</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? "Удаление..." : "Удалить"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
