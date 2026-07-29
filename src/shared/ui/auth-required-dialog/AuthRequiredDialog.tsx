import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  useTheme,
  alpha,
} from "@mui/material";
import { Close as CloseIcon, Login, LockOutlined } from "@mui/icons-material";
import { useRouter } from "next/navigation";

interface AuthRequiredDialogProps {
  open: boolean;
  onClose: () => void;
  productName?: string;
}

export const AuthRequiredDialog: React.FC<AuthRequiredDialogProps> = ({
  open,
  onClose,
  productName,
}) => {
  const theme = useTheme();
  const router = useRouter();

  const handleLogin = () => {
    onClose();
    router.push("/auth/login");
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          overflow: "visible",
          position: "relative",
          mx: { xs: 2, sm: 3 },
          my: { xs: 2, sm: 3 },
        },
      }}
    >
      {/* Close button */}
      <IconButton
        onClick={handleClose}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          color: theme.palette.grey[400],
          "&:hover": {
            backgroundColor: alpha(theme.palette.grey[400], 0.1),
          },
          zIndex: 1,
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent
        sx={{
          p: { xs: 3, sm: 4 },
          pb: { xs: 2, sm: 3 },
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 3,
          }}
        >
          <Box
            sx={{
              width: { xs: 64, sm: 80 },
              height: { xs: 64, sm: 80 },
              borderRadius: "50%",
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <LockOutlined
              sx={{
                fontSize: { xs: 28, sm: 36 },
                color: theme.palette.primary.main,
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 24,
                height: 24,
                borderRadius: "50%",
                backgroundColor: theme.palette.error.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${theme.palette.background.paper}`,
              }}
            >
              <Typography
                sx={{
                  color: "white",
                  fontSize: "12px",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                !
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Title */}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 1.5,
            color: theme.palette.text.primary,
            fontSize: { xs: "1.25rem", sm: "1.5rem" },
          }}
        >
          Требуется авторизация
        </Typography>

        {/* Description */}
        <Typography
          variant="body1"
          sx={{
            color: theme.palette.text.secondary,
            mb: 3,
            lineHeight: 1.6,
            fontSize: { xs: "0.875rem", sm: "1rem" },
          }}
        >
          {productName ? (
            <>
              Чтобы добавить <strong>&quot;{productName}&quot;</strong>{" "}
              необходимо войти в аккаунт
            </>
          ) : (
            "Чтобы добавить товар, необходимо войти в аккаунт"
          )}
        </Typography>

        <Box
          sx={{
            display: { xs: "none", sm: "block" },
            textAlign: "left",
            mb: 3,
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            borderRadius: "12px",
            p: 2,
          }}
        >
          <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mb: 1.5,
                color: theme.palette.text.primary,
                fontSize: "0.875rem",
              }}
            >
              После авторизации вы сможете:
            </Typography>
            <Box
              component="ul"
              sx={{
                m: 0,
                pl: 2,
                "& li": {
                  mb: 0.5,
                  fontSize: "0.8125rem",
                  color: theme.palette.text.secondary,
                  lineHeight: 1.5,
                },
              }}
            >
              <li>Добавлять товары в корзину</li>
              <li>Сохранять избранные товары</li>
              <li>Отслеживать заказы</li>
            </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: { xs: 3, sm: 4 },
          pt: 0,
          gap: 1.5,
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            width: { xs: "100%", sm: "auto" },
            borderRadius: "12px",
            py: 1.25,
            px: 3,
            fontSize: { xs: "0.875rem", sm: "1rem" },
            fontWeight: 600,
            order: { xs: 2, sm: 1 },
            minWidth: { xs: "auto", sm: 120 },
          }}
        >
          Отмена
        </Button>
        <Button
          onClick={handleLogin}
          variant="contained"
          startIcon={<Login />}
          sx={{
            width: { xs: "100%", sm: "auto" },
            borderRadius: "12px",
            py: 1.25,
            px: 3,
            fontSize: { xs: "0.875rem", sm: "1rem" },
            fontWeight: 600,
            order: { xs: 1, sm: 2 },
            minWidth: { xs: "auto", sm: 140 },
            boxShadow: "0 4px 16px rgba(239, 66, 132, 0.3)",
            "&:hover": {
              boxShadow: "0 6px 20px rgba(239, 66, 132, 0.4)",
              transform: "translateY(-1px)",
            },
            transition: "all 0.2s ease-in-out",
          }}
        >
          Войти
        </Button>
      </DialogActions>
    </Dialog>
  );
};
