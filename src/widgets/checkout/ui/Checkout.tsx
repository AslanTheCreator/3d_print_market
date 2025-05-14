"use client";

import React, { useEffect } from "react";
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
      region: "",
      city: "",
      address: "",
      fullName: "",
      email: "",
      phone: "",
      deliveryMethod: "pickup",
      paymentMethod: "card",
      comment: "",
      useProfileAddress: true,
    },
  });

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

  const handleUseProfileAddressChange = (checked: boolean) => {
    setValue("useProfileAddress", checked);
    if (checked && userProfile) {
      prefillAddressFromProfile(userProfile);
    } else {
      clearAddressFields();
    }
  };

  const clearAddressFields = () => {
    setValue("region", "");
    setValue("city", "");
    setValue("address", "");
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
    addressId: userProfile?.addresses[0]?.id || 0,
    transferId: 1,
    comment: data.comment,
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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Адрес доставки</Typography>

            {userProfile && userProfile.addresses[0] && (
              <FormControlLabel
                control={
                  <Controller
                    name="useProfileAddress"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onChange={(e) =>
                          handleUseProfileAddressChange(e.target.checked)
                        }
                      />
                    )}
                  />
                }
                label="Использовать адрес из профиля"
                sx={{ ml: 0 }}
              />
            )}
          </Box>

          {isUserLoading ? (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography>Загрузка данных пользователя...</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="region"
                  control={control}
                  rules={{ required: "Это поле обязательно" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Регион"
                      error={!!errors.region}
                      helperText={errors.region?.message}
                      disabled={
                        useProfileAddress &&
                        !!userProfile?.addresses[0]?.country
                      }
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="city"
                  control={control}
                  rules={{ required: "Это поле обязательно" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Город"
                      error={!!errors.city}
                      helperText={errors.city?.message}
                      disabled={
                        useProfileAddress && !!userProfile?.addresses[0]?.city
                      }
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="address"
                  control={control}
                  rules={{ required: "Это поле обязательно" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Улица, дом, квартира"
                      error={!!errors.address}
                      helperText={errors.address?.message}
                      disabled={
                        useProfileAddress && !!userProfile?.addresses[0]?.street
                      }
                    />
                  )}
                />
              </Grid>
            </Grid>
          )}
        </Paper>

        {/* Получатель */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Получатель
          </Typography>
          {isUserLoading ? (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography>Загрузка данных пользователя...</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="fullName"
                  control={control}
                  rules={{ required: "Это поле обязательно" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Имя"
                      error={!!errors.fullName}
                      helperText={errors.fullName?.message}
                      disabled={useProfileAddress && !!userProfile?.fullName}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="email"
                  control={control}
                  rules={{
                    required: "Это поле обязательно",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Некорректный email адрес",
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Email"
                      type="email"
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      disabled={useProfileAddress && !!userProfile?.mail}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="phone"
                  control={control}
                  rules={{
                    required: "Это поле обязательно",
                    pattern: {
                      value:
                        /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
                      message: "Некорректный номер телефона",
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Телефон"
                      error={!!errors.phone}
                      helperText={errors.phone?.message}
                      disabled={useProfileAddress && !!userProfile?.phoneNumber}
                    />
                  )}
                />
              </Grid>
            </Grid>
          )}
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
          {userProfile && !useProfileAddress && (
            <Button
              variant="outlined"
              color="primary"
              size="medium"
              onClick={() => {
                // Logic to save address to profile
              }}
              sx={{ mb: 1 }}
            >
              Сохранить этот адрес в профиле
            </Button>
          )}

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
    </Container>
  );
};

export default Checkout;
