import React, { useState } from "react";
import {
  Box,
  Typography,
  Divider,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  AddressInput,
  AddressSelector,
  AddressForm,
} from "@/entities/address";
import { useNotification } from "@/app/providers";
import { Address } from "@/shared/types";

type ViewMode = "list" | "add";

export const AddressManager: React.FC = () => {
  const { mutateAsync: createAddress, isPending: isCreating } =
    useCreateAddress();
  const { mutateAsync: deleteAddress, isPending: isDeleting } =
    useDeleteAddress();
  const { data: addresses = [], isLoading, refetch } = useAddresses();
  const { showNotification } = useNotification();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null);

  const handleSubmit = async (data: AddressInput) => {
    try {
      await createAddress(data);
      setViewMode("list");
      refetch();
      showNotification("Адрес успешно добавлен", "success");
    } catch (error) {
      showNotification("Не удалось добавить адрес", "error");
    }
  };

  const handleCancel = () => {
    setViewMode("list");
  };

  const handleAddNewAddress = () => {
    setViewMode("add");
  };

  const openDeleteDialog = (address: Address) => {
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
      showNotification("Адрес успешно удалён", "success");
      refetch();
      closeDeleteDialog();
    } catch (error) {
      showNotification("Не удалось удалить адрес", "error");
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        {viewMode === "add" ? "Добавить новый адрес" : "Мои адреса"}
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* Режим списка */}
      <Collapse in={viewMode === "list"}>
        <AddressSelector
          addresses={addresses}
          isLoading={isLoading}
          onAddressSelect={() => {}}
          onAddNewAddress={handleAddNewAddress}
          onDeleteAddress={openDeleteDialog}
          showRadio={false}
          showDeleteButton={true}
          showAddButton={true}
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

      {/* Диалог подтверждения удаления */}
      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Удалить адрес?</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1.5 }}>
            {addressToDelete &&
              `${addressToDelete.city}, ${addressToDelete.street} ${addressToDelete.houseNumber}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={closeDeleteDialog}
            variant="outlined"
            disabled={isDeleting}
          >
            Отмена
          </Button>
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
