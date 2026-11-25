"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@mui/material";
import { toOrderImageDataUrl, useOrderImagesQuery } from "@/entities/image";
import { orderApi, orderQueryKeys, type ListOrdersModel } from "@/entities/order";
import { usePrivateScope } from "@/shared/lib/query";
import { useSellerPaymentReview } from "../model/useSellerPaymentReview";
import { reviewHistory } from "../model/paymentEvidence";
import { PaymentReviewDialog } from "./PaymentReviewDialog";

type Props = { order: ListOrdersModel; available: boolean };

export function SellerPaymentReview(props: Props) {
  const review = useSellerPaymentReview(props.order, props.available);
  return <ReviewAction key={JSON.stringify([review.scopeId, review.actor, props.order.orderId])} {...props} review={review} />;
}

function ReviewAction({ order, available, review }: Props & { review: ReturnType<typeof useSellerPaymentReview> }) {
  const [open, setOpen] = useState(false);
  const prepayment = order.actualStatus === "AWAITING_PREPAYMENT_APPROVAL";
  const reviewing = prepayment || order.actualStatus === "AWAITING_PAYMENT_APPROVAL";
  const state = review.attempt;
  if (!review.current() || review.actor !== order.product.sellerId) {
    if (reviewing) return <Button disabled>{prepayment ? "Подтвердить предоплату" : "Проверить оплату"}</Button>;
    return null;
  }
  if (!reviewing && !state?.blocked && !open) return null;
  return <>
    <Button variant="contained" disabled={!state?.blocked && (!available || review.otherBusy || !order.calculation?.known)}
      onClick={() => setOpen(true)}>{state?.blocked ? "Проверить результат" : prepayment ? "Подтвердить предоплату" : "Проверить оплату"}</Button>
    {open && review.current() && <OpenReview order={order} review={review} close={() => setOpen(false)} />}
  </>;
}

function OpenReview({ order, review, close }: { order: ListOrdersModel; review: ReturnType<typeof useSellerPaymentReview>; close: () => void }) {
  const scope = usePrivateScope();
  useQuery({ queryKey: scope.key(orderQueryKeys.sellerOrders()), queryFn: ({ signal }) => orderApi.getSellerOrders(signal),
    staleTime: 0, refetchOnMount: "always", retry: false });
  const proofId = order.actualStatus === "AWAITING_PREPAYMENT_APPROVAL" ||
    order.actualStatus === "AWAITING_PAYMENT_APPROVAL" ? order.paymentProofImageId : null;
  const image = useOrderImagesQuery(order.orderId, proofId ? [proofId] : []);
  const src = image.isSuccess && image.data.length === 1 ? toOrderImageDataUrl(image.data[0]) : null;
  const history = useQuery(review.historyOptions);
  const evidence = reviewHistory(order, history.isSuccess ? history.data : undefined, order.userInfo.id);
  const aligned = evidence.state === "current" || evidence.state === "legacy";
  const job = review.attempt;
  return <PaymentReviewDialog order={order} actions={aligned ? review.actions.actions : []}
    historyState={evidence.state} submission={evidence.submission}
    proof={{ id: proofId, src: src ?? undefined, fetching: image.isFetching, retry: () => { void image.refetch(); } }} blocked={!!job?.blocked}
    busy={!!job?.busy} message={job?.message} previousReturn={evidence.previous} onClose={close} onCheck={review.recheck}
    onRefresh={review.refresh} onSubmit={review.submit} key={job?.settledVersion ?? "draft"} />;
}
