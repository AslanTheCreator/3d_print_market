"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Typography } from "@mui/material";
import { toOrderImageDataUrl, useOrderImagesQuery } from "@/entities/image";
import { adminOrderApi, adminOrderKeys, orderApi, orderQueryKeys, type AdminOrderDto, type AdminOrderFilter, type ListOrdersDto, type ListOrdersModel } from "@/entities/order";
import { usePrivateScope } from "@/shared/lib/query";
import { usePaymentReview, type ReviewContext } from "../model/usePaymentReview";
import { useProfileUser, type UserProfileModel } from "@/entities/user";
import { reviewHistory } from "../model/paymentEvidence";
import { PaymentReviewDialog } from "./PaymentReviewDialog";

type Props = { order: ListOrdersModel | AdminOrderDto; available: boolean };
type Review = ReturnType<typeof usePaymentReview>;

export function SellerPaymentReview(props: { order: ListOrdersModel; available: boolean }) {
  const actor = useProfileUser().data?.id;
  const context = { role: "seller" } as const;
  const review = usePaymentReview(props.order, props.available, context, actor);
  return <ReviewAction key={JSON.stringify([review.scopeId, actor, props.order.orderId])} {...props} context={context} review={review} />;
}

export function AdminPaymentReview({ order, available, session, filter, onOpen, onDismiss }: Props & {
  order: AdminOrderDto; session: number | null; filter: AdminOrderFilter; onOpen: (open: boolean) => void; onDismiss: () => void;
}) {
  const client = useQueryClient();
  const cache = client.getQueryCache();
  const profile = () => client.getQueryData<UserProfileModel>(["admin", session, "access"]);
  const actor = useSyncExternalStore(cache.subscribe.bind(cache), profile, profile)?.id;
  const context = { role: "admin", agentId: order.sellerId, session, filter } as const;
  const review = usePaymentReview(order, available, context, actor);
  return <ReviewAction key={JSON.stringify([session, actor, filter.agentId, order.sellerId, order.orderId])}
    order={order} available={available} context={context} review={review} onOpen={onOpen} onDismiss={onDismiss} />;
}

function ReviewAction({ order, available, review, context, onOpen, onDismiss }: Props & {
  review: Review; context: ReviewContext; onOpen?: (open: boolean) => void; onDismiss?: () => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) onOpen?.(true);
    return () => { if (open) onOpen?.(false); };
  }, [open, onOpen]);
  const prepayment = order.actualStatus === "AWAITING_PREPAYMENT_APPROVAL";
  const reviewing = prepayment || order.actualStatus === "AWAITING_PAYMENT_APPROVAL";
  const state = review.attempt;
  if (!review.current() || (context.role === "admin" && state?.blocked && state.actor !== review.actor)) {
    if (reviewing && context.role === "admin") return <Typography role="status">Обновите данные заказа и полномочия администратора.</Typography>;
    if (reviewing) return <Button disabled>{prepayment ? "Подтвердить предоплату" : "Проверить оплату"}</Button>;
    return null;
  }
  if (!reviewing && !state?.blocked && !open) return null;
  return <>
    <Button variant="contained" disabled={!state?.blocked && (!available || review.otherBusy || !order.calculation?.known)}
      onClick={() => setOpen(true)}>{state?.blocked ? "Проверить результат" : prepayment ? "Подтвердить предоплату" : "Проверить оплату"}</Button>
    {open && review.current() && <OpenReview context={context} order={order} review={review} close={() => { setOpen(false); onDismiss?.(); }} />}
  </>;
}

function OpenReview({ order, review, close, context }: { order: Props["order"]; review: Review; context: ReviewContext; close: () => void }) {
  const scope = usePrivateScope();
  useQuery<(ListOrdersDto | AdminOrderDto)[]>({
    queryKey: context.role === "admin" ? adminOrderKeys.list(scope.id, context.filter) : scope.key(orderQueryKeys.sellerOrders()),
    queryFn: ({ signal }) => {
      if (!review.current()) throw new Error("Обновите данные заказа");
      return context.role === "admin" ? adminOrderApi.list(context.filter, signal) : orderApi.getSellerOrders(signal);
    },
    staleTime: 0, refetchOnMount: "always", retry: false,
  });
  const showOrder = context.role === "seller" || review.currentRow;
  const proofId = showOrder && (order.actualStatus === "AWAITING_PREPAYMENT_APPROVAL" ||
    order.actualStatus === "AWAITING_PAYMENT_APPROVAL") ? order.paymentProofImageId : null;
  const image = useOrderImagesQuery(order.orderId, proofId ? [proofId] : [],
    context.role === "admin" ? { agentId: context.agentId, current: review.current } : undefined);
  const src = image.isSuccess && image.data.length === 1 ? toOrderImageDataUrl(image.data[0]) : null;
  const history = useQuery(review.historyOptions);
  const evidence = reviewHistory(order, history.isSuccess ? history.data : undefined, order.userInfo.id);
  const aligned = evidence.state === "current" || evidence.state === "legacy";
  const job = review.attempt;
  return <PaymentReviewDialog unavailable={!showOrder} agentId={context.role === "admin" ? context.agentId : undefined} order={order} actions={aligned ? review.actions.actions : []}
    historyState={evidence.state} submission={evidence.submission}
    proof={{ id: proofId, src: src ?? undefined, fetching: image.isFetching, retry: () => { void image.refetch(); } }} blocked={!!job?.blocked}
    busy={!!job?.busy} message={job?.message} previousReturn={evidence.previous} onClose={close} onCheck={review.recheck}
    onRefresh={review.refresh} onSubmit={review.submit} key={job?.settledVersion ?? "draft"} />;
}
