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
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  AddressInput,
  AddressSelector,
  AddressForm,
} from "@/entities/address";
import { useNotification } from "@/shared/ui/notification";
import { Address } from "@/entities/address";

type ViewMode = "list" | "add" | "edit";

export const AddressManager: React.FC = () => {
  const { mutateAsync: createAddress, isPending: isCreating } =
    useCreateAddress();
  const { mutateAsync: updateAddress, isPending: isUpdating } =
    useUpdateAddress();
  const { mutateAsync: deleteAddress, isPending: isDeleting } =
    useDeleteAddress();
  const {
    data: addresses = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useAddresses();
  const { showNotification } = useNotification();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [addressToEdit, setAddressToEdit] = useState<Address | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null);

  const handleCreate = async (data: AddressInput) => {
    try {
      await createAddress(data);
      setViewMode("list");
      showNotification("Адрес успешно добавлен", "success");
    } catch (error) {
      showNotification("Не удалось добавить адрес", "error");
      throw error;
    }
  };

  const handleUpdate = async (data: AddressInput) => {
    if (!addressToEdit) return;

    try {
      await updateAddress({ id: addressToEdit.id, input: data });
      setAddressToEdit(null);
      setViewMode("list");
      showNotification("Адрес успешно обновлён", "success");
    } catch (error) {
      showNotification("Не удалось обновить адрес", "error");
      throw error;
    }
  };

  const handleCancel = () => {
    setAddressToEdit(null);
    setViewMode("list");
  };

  const handleAddNewAddress = () => {
    setAddressToEdit(null);
    setViewMode("add");
  };

  const handleEditAddress = (address: Address) => {
    setAddressToEdit(address);
    setViewMode("edit");
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
      closeDeleteDialog();
    } catch (error) {
      showNotification("Не удалось удалить адрес", "error");
    }
  };

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: { xs: 1.5, sm: 2 },
          fontSize: { xs: "1rem", sm: "1.25rem" },
        }}
      >
        {viewMode === "add"
          ? "Добавить новый адрес"
          : viewMode === "edit"
            ? "Редактировать адрес"
            : "Мои адреса"}
      </Typography>

      <Divider sx={{ mb: { xs: 2, sm: 3 } }} />

      {/* Режим списка */}
      <Collapse in={viewMode === "list"} unmountOnExit>
        {isError ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                disabled={isRefetching}
                onClick={() => void refetch()}
                startIcon={
                  isRefetching ? <CircularProgress size={16} /> : undefined
                }
              >
                {isRefetching ? "Загрузка..." : "Повторить"}
              </Button>
            }
          >
            Не удалось загрузить адреса. Повторите попытку.
          </Alert>
        ) : (
          <AddressSelector
            addresses={addresses}
            isLoading={isLoading}
            onAddressSelect={() => {}}
            onAddNewAddress={handleAddNewAddress}
            onEditAddress={handleEditAddress}
            onDeleteAddress={openDeleteDialog}
            showRadio={false}
            showEditButton={true}
            showDeleteButton={true}
            showAddButton={true}
          />
        )}
      </Collapse>

      {/* Режим добавления */}
      <Collapse in={viewMode !== "list"} unmountOnExit>
        {viewMode === "add" && (
          <AddressForm
            key="add-address"
            onSubmit={handleCreate}
            onCancel={handleCancel}
            isLoading={isCreating}
            submitButtonText="Добавить адрес"
            title=""
          />
        )}

        {viewMode === "edit" && addressToEdit && (
          <AddressForm
            key={`edit-address-${addressToEdit.id}`}
            initialData={addressToEdit}
            onSubmit={handleUpdate}
            onCancel={handleCancel}
            isLoading={isUpdating}
            submitButtonText="Сохранить изменения"
            title=""
          />
        )}
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
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 2 },
            flexDirection: { xs: "column-reverse", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: { xs: 1, sm: 0 },
            "& > :not(:first-of-type)": {
              ml: { xs: 0, sm: 1 },
            },
          }}
        >
          <Button
            onClick={closeDeleteDialog}
            variant="outlined"
            disabled={isDeleting}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Отмена
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {isDeleting ? "Удаление..." : "Удалить"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
