"use client";

import { usePrivateScope } from "@/shared/lib/query";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { productKeys } from "@/entities/product";
import { useCreateReview } from "@/entities/review";
import { userKeys } from "@/entities/user";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { LeaveReviewFormData } from "./types";
import { getOrderReviewState, orderApi, orderQueryKeys, type ListOrdersDto } from "@/entities/order";
import { transformToApiError } from "@/shared/lib/errorHandler";
import { useNotification } from "@/shared/ui/notification";
import { useOrderDialogLifecycle } from "./useOrderDialogLifecycle";
import { useOrderActionsAvailable } from "./orderActionsContext";
import { hasOrderReviewFields, resolveReviewCheck, type ReviewRecovery } from "./orderReviewRecovery";

type DialogState = "form" | "success";

type ReviewAttempt =
  | { state: "idle" | "pending" | "legacy-published" }
  | ({ state: "checking" | "needs-check" } & ReviewRecovery);

const idleAttempt: ReviewAttempt = { state: "idle" };

function allowsReview(order: ListOrdersDto, attempt: ReviewAttempt) {
  return getOrderReviewState(order, "customer") === "available" &&
    (attempt.state === "idle" ||
      (attempt.state === "legacy-published" && hasOrderReviewFields(order)));
}

function refreshReviewData(queryClient: QueryClient, sellerId: number) {
  void queryClient.invalidateQueries({ queryKey: productKeys.details() });
  void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: userKeys.byId(sellerId) });
}

function settleReviewCheck(
  queryClient: QueryClient,
  attemptKey: readonly unknown[],
  recovery: ReviewRecovery,
  order: ListOrdersDto | undefined,
  confirmedRead: boolean,
) {
  const result = resolveReviewCheck(order, recovery, confirmedRead);
  const next: ReviewAttempt = result === "needs-check"
    ? { ...recovery, state: result }
    : { state: result };
  queryClient.setQueryData(attemptKey, next);
  if (recovery.reason === "unknown" && order?.reviewId != null) {
    refreshReviewData(queryClient, order.product.sellerId);
  }
}

interface UseLeaveReviewOptions {
  order: ListOrdersDto;
  open: boolean;
  onClose: () => void;
}

export const useLeaveReview = ({
  order,
  open,
  onClose,
}: UseLeaveReviewOptions) => {
  const { orderId } = order;
  const scope = usePrivateScope();
  const [dialogState, setDialogState] = useState<DialogState>("form");
  const actionsAvailable = useOrderActionsAvailable(orderId);
  const actionsAvailableRef = useRef(actionsAvailable);
  actionsAvailableRef.current = actionsAvailable;
  const createReviewMutation = useCreateReview();
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const ordersKey = scope.key(orderQueryKeys.customerOrders());
  const attemptKey = scope.key(["orderReview", orderId]);
  // Один заказ может одновременно отображаться в нескольких блоках.
  const { data: attempt } = useQuery<ReviewAttempt>({
    queryKey: attemptKey,
    queryFn: () => idleAttempt,
    initialData: idleAttempt,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (attempt.state !== "needs-check") return;
    const cache = queryClient.getQueryCache();
    const orderListKey = scope.key(orderQueryKeys.customerOrders());
    const reviewKey = scope.key(["orderReview", orderId]);
    return cache.subscribe(event => {
      if (event.type !== "updated" || event.action.type !== "success" || event.action.manual ||
        !scope.isCurrent() || event.query !== cache.find({ queryKey: orderListKey, exact: true })) return;
      const recovery = queryClient.getQueryData<ReviewAttempt>(reviewKey);
      if (recovery?.state !== "needs-check") return;
      const freshOrder = queryClient.getQueryData<ListOrdersDto[]>(orderListKey)?.find(item => item.orderId === orderId);
      settleReviewCheck(queryClient, reviewKey, recovery, freshOrder, true);
    });
  }, [attempt.state, orderId, queryClient, scope]);

  const form = useForm<LeaveReviewFormData>({
    mode: "onChange",
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const lifecycle = useOrderDialogLifecycle(open, () => {
    setDialogState("form");
    form.reset();
    if (queryClient.getQueryData<ReviewAttempt>(attemptKey)?.state !== "pending") {
      createReviewMutation.reset();
    }
  });
  const closeDialog = () => {
    if (queryClient.getQueryData<ReviewAttempt>(attemptKey)?.state === "pending" ||
      createReviewMutation.isPending) return;
    onClose();
  };

  const checkResult = async (manual = true) => {
    if (!scope.isCurrent()) return;
    const recovery = queryClient.getQueryData<ReviewAttempt>(attemptKey);
    if (recovery?.state !== "needs-check") return;

    const checking = queryClient.setQueryData<ReviewAttempt>(attemptKey, { ...recovery, state: "checking" });
    const isCurrent = () => scope.isCurrent() && queryClient.getQueryData(attemptKey) === checking;
    try {
      // Запрос, начатый до окончания POST, не подтверждает его результат.
      await queryClient.cancelQueries({ queryKey: ordersKey, exact: true });
      if (!isCurrent()) return;
      await queryClient.fetchQuery({
        queryKey: ordersKey,
        queryFn: ({ signal }) => orderApi.getCustomerOrders(signal),
        staleTime: 0,
        retry: false,
        networkMode: "always",
      });
      if (!isCurrent()) return;
      const fresh = queryClient.getQueryState<ListOrdersDto[]>(ordersKey);
      const freshOrder = fresh?.status === "success" ? fresh.data?.find(item => item.orderId === orderId) : undefined;
      settleReviewCheck(queryClient, attemptKey, recovery, freshOrder, manual);
    } catch {
      if (isCurrent()) queryClient.setQueryData(attemptKey, recovery);
    }
  };

  const verifyAfterWrite = (reason: ReviewRecovery["reason"], previousOrder: ReviewRecovery["previousOrder"]) => {
    const { actualStatus, canLeaveReview, reviewId } = previousOrder;
    const recovery: ReviewAttempt = {
      state: "needs-check", reason, previousOrder: { actualStatus, canLeaveReview, reviewId },
    };
    queryClient.setQueryData(attemptKey, recovery);
    void checkResult(false);
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    const generation = lifecycle.generation;
    if (!scope.isCurrent() || !actionsAvailableRef.current || !lifecycle.isCurrent(generation)) return;

    const latest = queryClient.getQueryState<ListOrdersDto[]>(ordersKey);
    const currentOrder = latest?.data?.find(item => item.orderId === orderId);
    const currentAttempt = queryClient.getQueryData<ReviewAttempt>(attemptKey) ?? idleAttempt;
    if (latest?.status !== "success" || !currentOrder || !allowsReview(currentOrder, currentAttempt)) return;

    queryClient.setQueryData<ReviewAttempt>(attemptKey, { state: "pending" });
    const comment = data.comment.trim();
    try {
      await createReviewMutation.mutateAsync({
        orderId,
        rating: data.rating,
        ...(comment && { comment }),
      });
    } catch (cause) {
      if (!scope.isCurrent()) return;
      const error = transformToApiError(cause);
      const duplicate = error.isCode("REVIEW_ALREADY_EXIST");
      const notTerminated = error.isCode("ORDER_NOT_TERMINATED");
      const unknown = error.isCode("TIMEOUT") || error.isCode("NETWORK_ERROR") ||
        error.isStatus(408) || error.isServerError() || error.statusCode === undefined;
      if (!duplicate && !notTerminated && !unknown) {
        // Mutation хранит ошибку для повторной отправки из открытой формы.
        queryClient.setQueryData(attemptKey, currentAttempt);
        return;
      }

      if (duplicate) refreshReviewData(queryClient, currentOrder.product.sellerId);
      verifyAfterWrite(duplicate ? "duplicate" : notTerminated ? "not-terminated" : "unknown", currentOrder);
      if (lifecycle.isCurrent(generation)) {
        if (duplicate || notTerminated) {
          showNotification(duplicate ? "Отзыв для этого заказа уже существует." :
            "Сейчас для этого заказа нельзя оставить отзыв.", "warning");
          onClose();
        } else {
          createReviewMutation.reset();
        }
      }
      return;
    }

    if (!scope.isCurrent()) return;
    refreshReviewData(queryClient, currentOrder.product.sellerId);
    verifyAfterWrite("accepted", currentOrder);
    if (lifecycle.isCurrent(generation)) setDialogState("success");
  });

  return {
    // Состояние диалога
    isDialogOpen: open,
    dialogState,
    closeDialog,
    onExited: lifecycle.onExited,
    canLeaveReview: allowsReview(order, attempt),
    actionsAvailable,
    publishedHere: order.reviewId == null && (
      (attempt.state === "legacy-published" && !hasOrderReviewFields(order)) ||
      ((attempt.state === "checking" || attempt.state === "needs-check") && attempt.reason === "accepted")
    ),
    reviewExists: order.reviewId != null,
    isChecking: attempt.state === "checking",
    needsCheck: attempt.state === "needs-check",
    checkResult,

    // Форма (react-hook-form)
    form,

    // Отправка
    handleSubmit,
    isPending: attempt.state === "pending" || createReviewMutation.isPending,
    isError: createReviewMutation.isError,
    error: createReviewMutation.error,
  };
};
