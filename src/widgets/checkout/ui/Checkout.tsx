"use client";

import React, { useState } from "react";
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
} from "@mui/material";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/shared/lib/formatPrice";
import { useCreateOrder } from "@/features/order/create-order/hooks/useCreateOrder";

type DeliveryAddressForm = {
  region: string;
  city: string;
  address: string;
};

type RecipientForm = {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  phone: string;
};

type PaymentMethod = "card";

const Checkout = () => {
  const router = useRouter();
  const { data: cartItems, isLoading } = useCartProducts({});

  const { mutate: createOrder, isPending } = useCreateOrder();

  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddressForm>({
    region: "",
    city: "",
    address: "",
  });

  const [recipient, setRecipient] = useState<RecipientForm>({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    phone: "",
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [comment, setComment] = useState("");

  const handleDeliveryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeliveryAddress({
      ...deliveryAddress,
      [e.target.name]: e.target.value,
    });
  };

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipient({
      ...recipient,
      [e.target.name]: e.target.value,
    });
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentMethod(e.target.value as PaymentMethod);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };

  // Расчет итоговой суммы
  const calculateTotals = () => {
    if (!cartItems?.length) return { subtotal: 0, deliveryPrice: 0, total: 0 };

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * 1, 0);
    const deliveryPrice = subtotal > 3000 ? 0 : 300; // Пример: доставка бесплатна от 3000₽

    return {
      subtotal,
      deliveryPrice,
      total: subtotal + deliveryPrice,
    };
  };

  const { subtotal, deliveryPrice, total } = calculateTotals();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Здесь будет логика отправки заказа на сервер
    console.log({
      items: cartItems,
      deliveryAddress,
      recipient,
      paymentMethod,
      comment,
      total,
    });

    // Перенаправление на страницу успешного оформления
    // router.push("/checkout/success");
    alert("Заказ успешно оформлен!"); // Временная замена перенаправления
  };

  // Проверка на наличие товаров
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
      <form onSubmit={handleSubmit}>
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Товары в заказе
          </Typography>
          <CartList items={cartItems} />
        </Paper>
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

        {/* Адрес доставки */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Адрес доставки
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Регион"
                name="region"
                value={deliveryAddress.region}
                onChange={handleDeliveryChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Город"
                name="city"
                value={deliveryAddress.city}
                onChange={handleDeliveryChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Улица, дом, квартира"
                name="address"
                value={deliveryAddress.address}
                onChange={handleDeliveryChange}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Получатель */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Получатель
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Имя"
                name="firstName"
                value={recipient.firstName}
                onChange={handleRecipientChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Фамилия"
                name="lastName"
                value={recipient.lastName}
                onChange={handleRecipientChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Отчество"
                name="middleName"
                value={recipient.middleName}
                onChange={handleRecipientChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={recipient.email}
                onChange={handleRecipientChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Телефон"
                name="phone"
                value={recipient.phone}
                onChange={handleRecipientChange}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Способ оплаты */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Способ оплаты
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup
              name="paymentMethod"
              value={paymentMethod}
              onChange={handlePaymentChange}
            >
              <FormControlLabel
                value="card"
                control={<Radio />}
                label="Оплата картой"
              />
            </RadioGroup>
            <RadioGroup
              name="paymentMethod"
              value={paymentMethod}
              onChange={handlePaymentChange}
            >
              <FormControlLabel value="card" control={<Radio />} label="СБП" />
            </RadioGroup>
          </FormControl>
        </Paper>

        {/* Комментарий */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Комментарий к заказу
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            name="comment"
            value={comment}
            onChange={handleCommentChange}
            placeholder="Дополнительная информация для продавца"
          />
        </Paper>

        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          onClick={handleSubmit}
          sx={{ mb: 4 }}
        >
          Подтвердить заказ
        </Button>
      </form>
    </Container>
  );
};

export default Checkout;
