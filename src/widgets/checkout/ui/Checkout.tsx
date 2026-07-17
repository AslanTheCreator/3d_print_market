"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Typography, Box, CircularProgress } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import {
  useOrderCreateSubmit,
  type CheckoutResult,
} from "@/features/order-create";
import { useCartProducts } from "@/entities/cart";
import { useProfileUser } from "@/entities/user";
import { useCheckoutState } from "../model/useCheckoutState";
import { CheckoutResultDialog } from "./CheckoutResultDialog";
import { CheckoutContent } from "./CheckoutContent";
import { OrderSuccessState } from "@/shared/ui/states";
import { EmptyPageState } from "@/shared/ui/states";
import { ErrorState } from "@/shared/ui/states";
import {
  ShoppingCartOutlined,
  StorefrontOutlined,
  FavoriteBorderOutlined,
} from "@mui/icons-material";

const Checkout = () => {
  const router = useRouter();
  const {
    data: cartItems,
    isLoading: isCartLoading,
    isError: isCartError,
    refetch: refetchCart,
  } = useCartProducts();
  const {
    data: currentUser,
    isPending: isLoadingCurrentUser,
    isError: isCurrentUserError,
  } = useProfileUser();

  const [completedProductIds, setCompletedProductIds] = useState<Set<number>>(
    () => new Set(),
  );
  const checkoutCartItems = useMemo(
    () =>
      (cartItems ?? []).filter(
        (item) => !completedProductIds.has(item.product.id),
      ),
    [cartItems, completedProductIds],
  );

  const checkoutState = useCheckoutState({
    cartItems: checkoutCartItems,
    currentUserId: currentUser?.id,
    isLoadingCurrentUser,
    isCurrentUserError,
  });

  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [lastResult, setLastResult] = useState<CheckoutResult | null>(null);

  const rememberSuccessfulOrders = useCallback((result: CheckoutResult) => {
    if (result.success.length === 0) {
      return;
    }

    setCompletedProductIds((currentIds) => {
      const nextIds = new Set(currentIds);

      for (const order of result.success) {
        nextIds.add(order.productId);
      }

      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, []);

  const handleSuccess = useCallback(
    (result: CheckoutResult) => {
      rememberSuccessfulOrders(result);
      setResultDialogOpen(true);
      setOrderCompleted(true);
      setLastResult(result);
    },
    [rememberSuccessfulOrders],
  );

  const handlePartialSuccess = useCallback(
    (result: CheckoutResult) => {
      rememberSuccessfulOrders(result);
      setResultDialogOpen(true);
      setLastResult(result);
    },
    [rememberSuccessfulOrders],
  );

  const handleError = useCallback((result: CheckoutResult) => {
    setResultDialogOpen(true);
    setLastResult(result);
  }, []);

  const { handleSubmit, retryFailed, isSubmitting, submitResult, clearResult } =
    useOrderCreateSubmit({
      cartItems: checkoutState.selectedItems,
      checkoutState,
      onSuccess: handleSuccess,
      onPartialSuccess: handlePartialSuccess,
      onError: handleError,
    });

  const handleCloseResultDialog = () => {
    setResultDialogOpen(false);
    clearResult();

    if (lastResult?.successCount === lastResult?.totalCount) {
      router.push("/dashboard/purchase");
    }
  };

  const handleGoHome = () => {
    setResultDialogOpen(false);
    router.push("/");
  };

  const handleGoToOrders = () => {
    setResultDialogOpen(false);
    router.push("/dashboard/purchase");
  };

  // Загрузка корзины
  if (isCartError) {
    return <ErrorState type="cart" onRetry={() => void refetchCart()} />;
  }

  if (isCartLoading || cartItems === undefined) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  // После успешного оформления — показываем OrderSuccessState вместо пустой корзины
  if (checkoutCartItems.length === 0 && orderCompleted) {
    return (
      <OrderSuccessState
        orderCount={completedProductIds.size || lastResult?.successCount}
        onGoToOrders={handleGoToOrders}
        onGoHome={handleGoHome}
      />
    );
  }

  if (checkoutCartItems.length === 0) {
    return (
      <EmptyPageState
        icon={
          <ShoppingCartOutlined
            sx={{
              fontSize: { xs: 48, sm: 56 },
              color: (t) => alpha(t.palette.primary.main, 0.6),
            }}
          />
        }
        title="Корзина пуста"
        description="Добавьте товары, которые вам понравились, и возвращайтесь сюда для оформления заказа."
        actions={[
          {
            label: "Перейти в каталог",
            icon: <StorefrontOutlined />,
            onClick: () => router.push("/"),
          },
          {
            label: "Избранное",
            icon: <FavoriteBorderOutlined />,
            onClick: () => router.push("/favorites"),
            variant: "outlined",
          },
        ]}
        tips={{
          title: "Не знаете с чего начать?",
          items: [
            "Просмотрите каталог и добавьте товары в корзину",
            "Загляните в избранное — возможно, там уже что-то ждёт",
            "Используйте поиск для быстрого нахождения нужного товара",
          ],
        }}
      />
    );
  }

  return (
    <>
      <Typography
        variant="h4"
        component="h1"
        fontWeight={700}
        sx={{
          mb: { xs: 2, sm: 4 },
          fontSize: { xs: "1.5rem", sm: "2rem" },
        }}
      >
        Оформление заказа
      </Typography>

      <CheckoutContent
        checkoutState={checkoutState}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />

      <CheckoutResultDialog
        open={resultDialogOpen}
        result={submitResult}
        onClose={handleCloseResultDialog}
        onRetry={retryFailed}
        onGoHome={handleGoHome}
        onGoToOrders={handleGoToOrders}
        isRetrying={isSubmitting}
      />
    </>
  );
};

export default Checkout;
