"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  Alert,
  Stack,
  IconButton,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import {
  Close,
  LocalShipping,
  Link as LinkIcon,
  CheckCircle,
  Info,
  ContentCopy,
} from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order/model/types";
import { useSendOrderBySeller } from "@/entities/order";

interface ShippingDialogProps {
  open: boolean;
  onClose: () => void;
  order: ListOrdersModel;
}

const ShippingDialog = ({ open, onClose, order }: ShippingDialogProps) => {
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [comment, setComment] = useState("");
  const [deliveryService, setDeliveryService] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const sendOrderMutation = useSendOrderBySeller();

  const deliveryServices = [
    {
      value: "cdek",
      label: "СДЭК",
      trackingUrl: "https://cdek.ru/track?order=",
    },
    {
      value: "pochta",
      label: "Почта России",
      trackingUrl: "https://www.pochta.ru/tracking#",
    },
    {
      value: "boxberry",
      label: "Boxberry",
      trackingUrl: "https://boxberry.ru/tracking/",
    },
    {
      value: "dpd",
      label: "DPD",
      trackingUrl: "https://www.dpd.ru/ols/trace/",
    },
    { value: "other", label: "Другая служба", trackingUrl: "" },
  ];

  const handleServiceChange = (service: string) => {
    setDeliveryService(service);

    // Автоматически формируем URL если есть трек-номер
    if (trackingNumber && service !== "other") {
      const serviceData = deliveryServices.find((s) => s.value === service);
      if (serviceData) {
        setDeliveryUrl(serviceData.trackingUrl + trackingNumber);
      }
    }
  };

  const handleTrackingNumberChange = (number: string) => {
    setTrackingNumber(number);

    // Автоматически формируем URL
    if (deliveryService && deliveryService !== "other") {
      const serviceData = deliveryServices.find(
        (s) => s.value === deliveryService
      );
      if (serviceData) {
        setDeliveryUrl(serviceData.trackingUrl + number);
      }
    }
  };

  const handleSendOrder = () => {
    if (!deliveryUrl.trim()) {
      return;
    }

    sendOrderMutation.mutate(
      {
        orderId: order.orderId,
        deliveryUrl: deliveryUrl.trim(),
        comment: comment.trim(),
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  const handleClose = () => {
    setDeliveryUrl("");
    setComment("");
    setDeliveryService("");
    setTrackingNumber("");
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const canSendOrder = deliveryUrl.trim() && !sendOrderMutation.isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <LocalShipping color="primary" />
            <Typography variant="h6">Отправка товара</Typography>
          </Stack>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {/* Информация о заказе */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Заказ #{order.orderId}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {order.product.name}
              </Typography>
              <Chip label="Оплачено" color="success" size="small" />
            </Box>
            <Typography variant="h6" color="primary.main" fontWeight={600}>
              {order.totalPrice} {order.product.currency}
            </Typography>
          </Stack>

          <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Info sx={{ fontSize: 16 }} />
              Адрес доставки
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.transfer.address}
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mt: 1 }}
            >
              <Typography variant="caption" color="text.secondary">
                {order.userInfo.login} • {order.userInfo.phoneNumber}
              </Typography>
              <IconButton
                size="small"
                onClick={() =>
                  copyToClipboard(
                    `${order.transfer.address}\n${order.userInfo.login}\n${order.userInfo.phoneNumber}`
                  )
                }
              >
                <ContentCopy sx={{ fontSize: 14 }} />
              </IconButton>
            </Stack>
          </Box>
        </Paper>

        {/* Выбор службы доставки */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Служба доставки</InputLabel>
          <Select
            value={deliveryService}
            label="Служба доставки"
            onChange={(e) => handleServiceChange(e.target.value)}
          >
            {deliveryServices.map((service) => (
              <MenuItem key={service.value} value={service.value}>
                {service.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Трек-номер */}
        {deliveryService && (
          <TextField
            fullWidth
            label="Номер для отслеживания"
            placeholder="Введите трек-номер"
            value={trackingNumber}
            onChange={(e) => handleTrackingNumberChange(e.target.value)}
            sx={{ mb: 2 }}
            helperText={
              deliveryService !== "other"
                ? "URL для отслеживания сформируется автоматически"
                : ""
            }
          />
        )}

        {/* URL для отслеживания */}
        <TextField
          fullWidth
          label="Ссылка для отслеживания"
          placeholder="https://example.com/track/123456"
          value={deliveryUrl}
          onChange={(e) => setDeliveryUrl(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <LinkIcon sx={{ mr: 1, color: "text.secondary" }} />
            ),
          }}
          helperText="Ссылка, по которой покупатель сможет отследить посылку"
          required
        />

        {/* Предпросмотр ссылки */}
        {deliveryUrl && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "success.50" }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CheckCircle color="success" sx={{ fontSize: 16 }} />
              <Typography variant="body2">
                Покупатель получит ссылку:
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              color="primary.main"
              sx={{
                mt: 1,
                wordBreak: "break-all",
                fontFamily: "monospace",
                fontSize: "0.75rem",
              }}
            >
              {deliveryUrl}
            </Typography>
          </Paper>
        )}

        {/* Комментарий */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Комментарий (необязательно)"
          placeholder="Дополнительная информация о доставке..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* Инструкция */}
        <Alert severity="info">
          <Typography variant="body2">
            После отправки покупатель получит уведомление с информацией о
            доставке и сможет отследить посылку по предоставленной ссылке.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={sendOrderMutation.isPending}>
          Отмена
        </Button>
        <Button
          onClick={handleSendOrder}
          variant="contained"
          disabled={!canSendOrder}
          startIcon={sendOrderMutation.isPending ? null : <LocalShipping />}
        >
          {sendOrderMutation.isPending ? "Отправка..." : "Отправить товар"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShippingDialog;
