import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  useMediaQuery,
  useTheme,
  Slide,
  Box,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import CloseIcon from "@mui/icons-material/Close";
import { useCreateAddress } from "@/entities/address/hooks";
import { AddressForm } from "@/entities/address";

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
  const { mutateAsync: createAddress, isPending } = useCreateAddress();

  const handleSubmit = async (data: AddressFormData) => {
    try {
      await createAddress(data);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Ошибка при создании адреса:", error);
      throw error;
    }
  };

  const handleClose = () => {
    if (!isPending) {
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
          disabled={isPending}
          size="small"
          sx={{
            color: theme.palette.text.secondary,
          }}
          aria-label="Закрыть"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

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
            isLoading={isPending}
            submitButtonText="Добавить адрес"
            title=""
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};
