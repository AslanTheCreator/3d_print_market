"use client";

import React, { useState, useMemo } from "react";
import { CartList, useCartProducts } from "@/entities/cart";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Divider,
  Stack,
  Alert,
  Snackbar,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/shared/lib/formatPrice";
import { useForm, Controller } from "react-hook-form";
import { AddressSelector } from "@/features/address/address-selector/ui/AddressSelector";
import { AddressBaseModel } from "@/entities/address/model/types";
import { useAddressDialog } from "@/features/address/create-address/hooks/useAddressDialog";
import { AddressDialog } from "@/features/address/create-address/ui/AddressDialog";
import {
  ShoppingMethods,
  TransferBaseModel,
} from "@/entities/transfer/model/types";
import { TransferSelector } from "@/features/transfer/transfer-selector/TransferSelector";
import {
  AccountsBaseModel,
  TransferMoney,
} from "@/entities/accounts/model/types";
import { PaymentSelector } from "@/features/accounts/account-selector/ui/PaymentSelector";
import { useCreateOrder, useOrderData } from "@/entities/order";
import { CartProductModel } from "@/entities/cart/model/types";

// Типы для групп товаров по продавцам
type SellerGroup = {
  sellerId: number;
  sellerName?: string;
  items: CartProductModel[];
};

type CheckoutFormValues = {
  comment: Record<number, string>;
  [key: string]: any;
};

const Checkout = () => {
  const router = useRouter();
  const { data: cartItems, isLoading: isCartLoading } = useCartProducts();
  const { mutate: createOrder, isPending } = useCreateOrder();

  // Состояние для Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "warning"
  >("success");

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CheckoutFormValues>({
    defaultValues: {
      comment: {},
    },
  });

  // Состояния для каждого продавца
  const [selectedTransfers, setSelectedTransfers] = useState<
    Record<number, TransferBaseModel | null>
  >({});
  const [selectedPayments, setSelectedPayments] = useState<
    Record<number, AccountsBaseModel | null>
  >({});
  const [selectedAddress, setSelectedAddress] =
    useState<AddressBaseModel | null>(null);

  // Группировка товаров по продавцам
  const sellerGroups = useMemo<SellerGroup[]>(() => {
    if (!cartItems?.length) return [];

    const groups = cartItems.reduce((acc, item) => {
      const sellerId = item.sellerId;
      if (!acc[sellerId]) {
        acc[sellerId] = {
          sellerId,
          sellerName: `Продавец ${sellerId}`,
          items: [],
        };
      }
      acc[sellerId].items.push(item);
      return acc;
    }, {} as Record<number, SellerGroup>);

    return Object.values(groups);
  }, [cartItems]);

  // Используем хуки для получения данных заказа для каждого продавца
  const orderDataQueries = sellerGroups.map((group) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const query = useOrderData(group.items[0]?.id || 0);
    return {
      sellerId: group.sellerId,
      ...query,
    };
  });

  const calculateTotals = () => {
    if (!cartItems?.length) return { subtotal: 0, deliveryPrice: 0, total: 0 };

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * 1, 0);
    const deliveryPrice = subtotal > 3000 ? 0 : 300;

    return {
      subtotal,
      deliveryPrice,
      total: subtotal + deliveryPrice,
    };
  };

  const { subtotal, deliveryPrice, total } = calculateTotals();

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "warning"
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const onSubmit = async (data: CheckoutFormValues) => {
    // Подготавливаем данные заказов для каждого продавца
    const orders = sellerGroups.map((group) => ({
      data: createOrderData(data, group),
      sellerName: group.sellerName,
      sellerId: group.sellerId,
    }));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < orders.length; i++) {
      const currentOrder = orders[i];

      try {
        await new Promise<void>((resolve, reject) => {
          createOrder(currentOrder.data, {
            onSuccess: (response) => {
              console.log(
                `✅ Заказ успешно создан  ${currentOrder.data.transferId}`
              );
              successCount++;
              resolve();
            },
            onError: (error) => {
              console.log(currentOrder.data.count);
              // Логируем только ошибки
              console.error(
                `❌ Ошибка при создании заказа для ${currentOrder.sellerName}:`,
                error
              );
              reject(error);
            },
          });
        });
      } catch (error) {
        errorCount++;
      }
    }

    // Обрабатываем результаты
    if (successCount === orders.length) {
      // Все заказы созданы успешно
      showSnackbar("Все заказы успешно созданы!", "success");
      reset();
      // Переходим на страницу успеха через 2 секунды
      setTimeout(() => {
        router.push("/checkout/success");
      }, 2000);
    } else if (successCount > 0) {
      // Частичный успех
      showSnackbar(
        `Создано ${successCount} из ${orders.length} заказов`,
        "warning"
      );
    } else {
      // Все заказы упали
      showSnackbar("Не удалось создать ни одного заказа", "error");
    }
  };

  const createOrderData = (data: CheckoutFormValues, group: SellerGroup) => ({
    productId: group.items[0]?.id,
    count: group.items[0]?.count,
    addressId: selectedAddress?.id || 0,
    transferId: selectedTransfers[group.sellerId]?.id || 0,
    comment: data.comment[group.sellerId] || "",
  });

  // Используем хук для управления диалогом
  const addressDialog = useAddressDialog(() => {
    showSnackbar("Адрес успешно добавлен!", "success");
  });

  const handleTransferSelect = (
    sellerId: number,
    transfer: TransferBaseModel | null
  ) => {
    setSelectedTransfers((prev) => ({
      ...prev,
      [sellerId]: transfer,
    }));
  };

  const handlePaymentSelect = (
    sellerId: number,
    payment: AccountsBaseModel | null
  ) => {
    setSelectedPayments((prev) => ({
      ...prev,
      [sellerId]: payment,
    }));
  };

  // Компонент для отображения результатов заказов удален - используются только уведомления

  if (isCartLoading) {
    return (
      <Container sx={{ my: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Загрузка корзины...
        </Typography>
      </Container>
    );
  }

  if (!cartItems?.length) {
    return (
      <Container sx={{ my: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Ваша корзина пуста
        </Typography>
        <Button variant="contained" onClick={() => router.push("/")}>
          Вернуться к покупкам
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ my: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Оформление заказа
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Адрес доставки - общий для всех продавцов */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Адрес доставки
          </Typography>
          <AddressSelector
            selectedAddressId={selectedAddress?.id}
            onAddressSelect={setSelectedAddress}
            onAddNewAddress={addressDialog.openDialog}
            addresses={orderDataQueries[0]?.data?.addresses || []}
            isLoading={orderDataQueries[0]?.isLoading || false}
          />
        </Paper>

        {/* Группы товаров по продавцам */}
        {sellerGroups.map((group, index) => {
          const orderQuery = orderDataQueries.find(
            (q) => q.sellerId === group.sellerId
          );

          return (
            <Box key={group.sellerId} sx={{ mb: 4 }}>
              {/* Заголовок продавца */}
              <Typography
                variant="h6"
                component="h2"
                gutterBottom
                sx={{
                  mb: 2,
                  p: 2,
                  backgroundColor: "primary.main",
                  color: "primary.contrastText",
                  borderRadius: 1,
                }}
              >
                {group.sellerName}
              </Typography>

              {/* Товары продавца */}
              <Paper sx={{ mb: 3, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Товары
                </Typography>
                <CartList items={group.items} />
              </Paper>

              {/* Способ доставки для продавца */}
              <Paper sx={{ mb: 3, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Способ получения
                </Typography>
                <TransferSelector
                  control={control}
                  name={`deliveryMethod_${group.sellerId}`}
                  error={
                    errors[`deliveryMethod_${group.sellerId}`] as
                      | import("react-hook-form").FieldError
                      | undefined
                  }
                  onTransferSelect={(transfer) =>
                    handleTransferSelect(group.sellerId, transfer)
                  }
                  showDescriptions={true}
                  hideUnavailable={true}
                  transfers={orderQuery?.data?.sellerTransfers || []}
                  isError={orderQuery?.isError || false}
                  isLoading={orderQuery?.isLoading || false}
                />
              </Paper>

              {/* Способ оплаты для продавца */}
              <Paper sx={{ mb: 3, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Способ оплаты
                </Typography>
                <PaymentSelector
                  control={control}
                  paymentMethodName={`paymentMethod_${group.sellerId}`}
                  accountIdName={`paymentAccountId_${group.sellerId}`}
                  error={(() => {
                    const err = errors[`paymentMethod_${group.sellerId}`];
                    return err && typeof err === "object" && "type" in err
                      ? (err as import("react-hook-form").FieldError)
                      : undefined;
                  })()}
                  onPaymentSelect={(payment) =>
                    handlePaymentSelect(group.sellerId, payment)
                  }
                  showDescriptions={true}
                  hideUnavailable={true}
                />
              </Paper>

              <Paper sx={{ mb: 3, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Комментарий к заказу
                </Typography>
                <Controller
                  name={`comment.${group.sellerId}`}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Дополнительная информация для продавцов"
                    />
                  )}
                />
              </Paper>

              {/* Разделитель между продавцами */}
              {index < sellerGroups.length - 1 && (
                <Divider sx={{ my: 4, borderWidth: 2 }} />
              )}
            </Box>
          );
        })}

        {/* Итоговая информация о заказе */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Ваш заказ
          </Typography>
          <Stack spacing={2}>
            <Box display="flex" justifyContent="space-between">
              <Typography>Товары ({cartItems.length}):</Typography>
              <Typography>{formatPrice(subtotal)} ₽</Typography>
            </Box>

            <Box display="flex" justifyContent="space-between">
              <Typography>Доставка:</Typography>
              <Typography>
                {deliveryPrice === 0
                  ? "Бесплатно"
                  : `${formatPrice(deliveryPrice)} ₽`}
              </Typography>
            </Box>

            <Divider />

            <Box display="flex" justifyContent="space-between">
              <Typography variant="h6">Итого:</Typography>
              <Typography variant="h6">{formatPrice(total)} ₽</Typography>
            </Box>
          </Stack>
        </Paper>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={isPending}
          >
            {isPending ? "Оформление..." : "Подтвердить заказ"}
          </Button>
        </Box>
      </form>

      <AddressDialog
        open={addressDialog.isOpen}
        onClose={addressDialog.closeDialog}
        onSuccess={addressDialog.handleSuccess}
      />

      {/* Snackbar для уведомлений */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Checkout;
