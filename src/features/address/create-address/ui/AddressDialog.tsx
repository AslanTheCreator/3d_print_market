import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useMediaQuery,
  useTheme,
  Slide,
  Box,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import CloseIcon from "@mui/icons-material/Close";
import { useCreateAddress } from "@/entities/address/hooks";
import { AddressForm } from "@/entities/address/ui/AddressForm";

interface AddressFormData {
  country: string;
  city: string;
  street: string;
  houseNumber: string;
  apartmentNumber: string;
  index: number;
}

interface AddAddressDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Transition для мобильных устройств - слайд снизу
const MobileTransition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const AddressDialog: React.FC<AddAddressDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const createAddressMutation = useCreateAddress();

  const handleSubmit = async (data: AddressFormData) => {
    try {
      await createAddressMutation.mutateAsync(data);
      onSuccess?.();
      onClose();
    } catch (error) {
      // Обработка ошибок уже в mutation
      console.error("Ошибка при создании адреса:", error);
    }
  };

  const handleClose = () => {
    if (!createAddressMutation.isPending) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={isMobile ? MobileTransition : undefined}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          ...(isMobile && {
            m: 0,
            maxWidth: "100%",
            maxHeight: "100%",
            borderRadius: 0,
          }),
        },
      }}
    >
      {/* Заголовок с кнопкой закрытия */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        Добавить новый адрес
        <IconButton
          onClick={handleClose}
          disabled={createAddressMutation.isPending}
          size="small"
          sx={{
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Контент диалога */}
      <DialogContent
        sx={{
          p: { xs: 2, sm: 3 },
          pb: { xs: 1, sm: 2 },
        }}
      >
        <Box sx={{ pt: 1 }}>
          <AddressForm
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isLoading={createAddressMutation.isPending}
            submitButtonText="Добавить адрес"
            title="" // Убираем заголовок, так как он уже в DialogTitle
          />
        </Box>
      </DialogContent>

      {/* Для мобильных устройств можно добавить дополнительную область действий */}
      {isMobile && (
        <DialogActions
          sx={{
            p: 2,
            pt: 0,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          {/* Дополнительные действия для мобильных, если нужны */}
        </DialogActions>
      )}
    </Dialog>
  );
};
