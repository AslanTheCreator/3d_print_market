"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  CheckCircleOutline,
  Receipt,
  Home,
} from "@mui/icons-material";

const Checkout = () => {
  const router = useRouter();
  const {
    data: cartItems,
    isLoading: isCartLoading,
    isError: isCartError,
    isFetching: isCartFetching,
    refetch: refetchCart,
  } = useCartProducts({ forceRefetchOnMount: true });
  const {
    data: currentUser,
    isPending: isLoadingCurrentUser,
    isError: isCurrentUserError,
  } = useProfileUser();
  const preorderProductIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    for (const item of cartItems ?? []) {
      if (item.product.availability === "PREORDER") {
        preorderProductIdsRef.current.add(item.product.id);
      }
    }
  }, [cartItems]);

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
    isRefreshingCart: isCartFetching,
    isCartValidationError: isCartError && cartItems !== undefined,
  });

  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [hasCompletedPreorder, setHasCompletedPreorder] = useState(false);
  const [lastResultHasPreorder, setLastResultHasPreorder] = useState(false);
  const [lastResult, setLastResult] = useState<CheckoutResult | null>(null);

  const rememberSuccessfulOrders = useCallback((result: CheckoutResult) => {
    const hasPreorder = result.success.some((order) =>
      preorderProductIdsRef.current.has(order.productId),
    );

    if (result.success.length > 0) {
      setCompletedProductIds((currentIds) => {
        const nextIds = new Set(currentIds);

        for (const order of result.success) {
          nextIds.add(order.productId);
        }

        return nextIds.size === currentIds.size ? currentIds : nextIds;
      });
    }

    if (hasPreorder) {
      setHasCompletedPreorder(true);
    }

    return hasPreorder;
  }, []);

  const handleSuccess = useCallback(
    (result: CheckoutResult) => {
      setLastResultHasPreorder(rememberSuccessfulOrders(result));
      setResultDialogOpen(true);
      setOrderCompleted(true);
      setLastResult(result);
    },
    [rememberSuccessfulOrders],
  );

  const handlePartialSuccess = useCallback(
    (result: CheckoutResult) => {
      setLastResultHasPreorder(rememberSuccessfulOrders(result));
      setResultDialogOpen(true);
      setLastResult(result);
    },
    [rememberSuccessfulOrders],
  );

  const handleError = useCallback((result: CheckoutResult) => {
    setLastResultHasPreorder(false);
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
  if (isCartError && cartItems === undefined) {
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
    if (hasCompletedPreorder) {
      return (
        <EmptyPageState
          icon={
            <CheckCircleOutline
              sx={{
                fontSize: { xs: 56, sm: 68 },
                color: "success.main",
              }}
            />
          }
          title="Заказы оформлены!"
          description="Заказы успешно созданы. Для предзаказов продавец сначала подтвердит заказ, после чего вам потребуется внести предоплату и затем оплатить остаток."
          actions={[
            {
              label: "Мои покупки",
              icon: <Receipt />,
              onClick: handleGoToOrders,
            },
            {
              label: "На главную",
              icon: <Home />,
              onClick: handleGoHome,
              variant: "outlined",
            },
          ]}
          tips={{
            title: "Что дальше с предзаказом",
            items: [
              "Дождитесь подтверждения заказа продавцом",
              "Внесите предоплату на следующем этапе",
              "После подтверждения предоплаты оплатите остаток",
            ],
          }}
        />
      );
    }

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
        onRetryStockValidation={() => void refetchCart()}
      />

      <CheckoutResultDialog
        open={resultDialogOpen}
        result={submitResult}
        onClose={handleCloseResultDialog}
        onRetry={retryFailed}
        onGoHome={handleGoHome}
        onGoToOrders={handleGoToOrders}
        isRetrying={isSubmitting}
        hasPreorderSuccess={lastResultHasPreorder}
      />
    </>
  );
};

export default Checkout;
