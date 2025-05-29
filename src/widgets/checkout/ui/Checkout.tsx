"use client";

import React, { useEffect, useState } from "react";
import { CartList, useCartProducts } from "@/entities/cart";
import {
  Container,
  Typography,
  Box,
  Grid,
  TextField,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Button,
  Paper,
  Divider,
  Stack,
  FormHelperText,
  Checkbox,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/shared/lib/formatPrice";
import { useCreateOrder } from "@/features/order/create-order/hooks/useCreateOrder";
import { useForm, Controller } from "react-hook-form";
import { useUser } from "@/entities/user/hooks/useUser";
import { AddressSelector } from "@/features/address/address-selector/ui/AddressSelector";
import { AddressBaseModel } from "@/entities/address/model/types";
import { useAddAddressDialog } from "@/features/address/create-address/hooks/useAddressDialog";
import { AddressDialog } from "@/features/address/create-address/ui/AddressDialog";

type DeliveryMethod = "pickup" | "delivery-company" | "russian-post";
type PaymentMethod = "card" | "sbp";

type CheckoutFormValues = {
  region: string;
  city: string;
  address: string;
  fullName: string;
  email: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  comment: string;
  useProfileAddress: boolean;
};

const Checkout = () => {
  const router = useRouter();
  const { data: cartItems, isLoading: isCartLoading } = useCartProducts({});
  const { mutate: createOrder, isPending } = useCreateOrder();
  const { data: userProfile, isLoading: isUserLoading } = useUser({});

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
      deliveryMethod: "pickup",
      paymentMethod: "card",
      comment: "",
    },
  });

  const [selectedAddress, setSelectedAddress] =
    useState<AddressBaseModel | null>(null);

  const useProfileAddress = watch("useProfileAddress");

  useEffect(() => {
    if (userProfile && !isUserLoading && useProfileAddress) {
      prefillAddressFromProfile(userProfile);
    }
  }, [userProfile, isUserLoading, setValue, useProfileAddress]);

  const prefillAddressFromProfile = (profile: typeof userProfile) => {
    if (profile?.addresses[0]) {
      setValue("region", profile.addresses[0].country || "");
      setValue("city", profile.addresses[0].city || "");
      setValue("address", profile.addresses[0].fullAddress || "");
    }
    setValue("fullName", profile?.fullName || "");
    setValue("email", profile?.mail || "");
    setValue("phone", profile?.phoneNumber || "");
  };

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
    transferId: 1,
    comment: data.comment,
  });

  // Используем хук для управления диалогом
  const addressDialog = useAddAddressDialog(() => {
    // Коллбек при успешном добавлении адреса
    // Можно добавить логику обновления списка адресов
    console.log("Адрес успешно добавлен!");
  });

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
          <FormControl
            component="fieldset"
            fullWidth
            error={!!errors.deliveryMethod}
          >
            <Controller
              name="deliveryMethod"
              control={control}
              rules={{ required: "Выберите способ доставки" }}
              render={({ field }) => (
                <RadioGroup {...field}>
                  <FormControlLabel
                    value="pickup"
                    control={<Radio />}
                    label="Самовывоз"
                  />
                  <FormControlLabel
                    value="delivery-company"
                    control={<Radio />}
                    label="Транспортная компания"
                  />
                  <FormControlLabel
                    value="russian-post"
                    control={<Radio />}
                    label="Почта России"
                  />
                </RadioGroup>
              )}
            />
            {errors.deliveryMethod && (
              <FormHelperText>{errors.deliveryMethod.message}</FormHelperText>
            )}
          </FormControl>
        </Paper>

        {/* Способ оплаты */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Способ оплаты
          </Typography>
          <FormControl
            component="fieldset"
            fullWidth
            error={!!errors.paymentMethod}
          >
            <Controller
              name="paymentMethod"
              control={control}
              rules={{ required: "Выберите способ оплаты" }}
              render={({ field }) => (
                <RadioGroup {...field}>
                  <FormControlLabel
                    value="card"
                    control={<Radio />}
                    label="Оплата картой"
                  />
                  <FormControlLabel
                    value="sbp"
                    control={<Radio />}
                    label="СБП"
                  />
                </RadioGroup>
              )}
            />
            {errors.paymentMethod && (
              <FormHelperText>{errors.paymentMethod.message}</FormHelperText>
            )}
          </FormControl>
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
