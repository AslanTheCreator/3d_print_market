"use client";

import React, { useState } from "react";
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
} from "@mui/material";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/shared/lib/formatPrice";
import { useCreateOrder } from "@/features/order/create-order/hooks/useCreateOrder";
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
import { useOrderData } from "@/entities/order/api/queries";

type CheckoutFormValues = {
  fullName: string;
  email: string;
  phone: string;
  deliveryMethod: ShoppingMethods;
  paymentMethod: TransferMoney;
  paymentAccountId?: number;
  comment: string;
  useProfileAddress: boolean;
};

const Checkout = () => {
  const router = useRouter();
  const { data: cartItems, isLoading: isCartLoading } = useCartProducts();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const {
    data: orderData,
    isLoading: isOrderDataLoading,
    isError: isOrderError,
    error,
  } = useOrderData(cartItems?.[0]?.id || 0);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CheckoutFormValues>({
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      deliveryMethod: "TRANSPORT_COMPANY",
      paymentMethod: "BANK_CARD",
      comment: "",
    },
  });

  const [selectedTransfer, setSelectedTransfer] =
    useState<TransferBaseModel | null>(null);
  const [selectedAddress, setSelectedAddress] =
    useState<AddressBaseModel | null>(null);
  const [selectedPayment, setSelectedPayment] =
    useState<AccountsBaseModel | null>(null);

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

  const onSubmit = (data: CheckoutFormValues) => {
    const orderData = createOrderData(data);
    console.log("Данные заказа:", orderData);

    createOrder(orderData, {
      onSuccess: () => {
        console.log("Заказ успешно оформлен", orderData);
        reset();
      },
    });
  };

  const createOrderData = (data: CheckoutFormValues) => ({
    productId: cartItems?.[1]?.id || 0,
    count: cartItems?.[0]?.count || 1,
    addressId: selectedAddress?.id || 0,
    transferId: selectedTransfer?.id || 0,
    comment: data.comment,
  });

  // Используем хук для управления диалогом
  const addressDialog = useAddressDialog(() => {
    // Коллбек при успешном добавлении адреса
    // Можно добавить логику обновления списка адресов
    console.log("Адрес успешно добавлен!");
  });

  const handleTransferSelect = (transfer: TransferBaseModel | null) => {
    setSelectedTransfer(transfer);

    // Дополнительная логика при выборе способа доставки
    if (transfer) {
      // Например, обновляем общую стоимость заказа
      console.log(
        `Выбран способ доставки: ${transfer.sending}, стоимость: ${transfer.price}`
      );
    }
  };

  const handlePaymentSelect = (payment: AccountsBaseModel | null) => {
    setSelectedPayment(payment);
    // if (payment) {
    //   setValue("paymentAccountId", payment);
    // }
  };

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
        {/* Адрес доставки */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Адрес доставки
          </Typography>
          <AddressSelector
            selectedAddressId={selectedAddress?.id}
            onAddressSelect={setSelectedAddress}
            onAddNewAddress={addressDialog.openDialog}
            addresses={orderData?.addresses || []}
            isLoading={isOrderDataLoading}
          />
        </Paper>

        {/* Товары в корзине */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Товары в корзине
          </Typography>
          <CartList items={cartItems} />
        </Paper>

        {/* Способ доставки */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Способ получения
          </Typography>

          <TransferSelector
            control={control}
            name="deliveryMethod"
            error={errors.deliveryMethod}
            onTransferSelect={handleTransferSelect}
            showDescriptions={true}
            hideUnavailable={true} // Показываем только методы из dictionary
            transfers={orderData?.sellerTransfers || []}
            isError={isOrderError}
            isLoading={isOrderDataLoading}
          />
        </Paper>

        {/* Способ оплаты */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Способ оплаты
          </Typography>
          <PaymentSelector
            control={control}
            paymentMethodName="paymentMethod"
            accountIdName="paymentAccountId"
            error={errors.paymentMethod}
            onPaymentSelect={handlePaymentSelect}
            showDescriptions={true}
            hideUnavailable={true}
          />
        </Paper>

        {/* Комментарий */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Комментарий к заказу
          </Typography>
          <Controller
            name="comment"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                rows={3}
                placeholder="Дополнительная информация для продавца"
              />
            )}
          />
        </Paper>

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
    </Container>
  );
};

export default Checkout;
