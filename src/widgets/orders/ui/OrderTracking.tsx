"use client";

import { Alert, Button, Stack, Typography } from "@mui/material";
import { LocalShippingOutlined, OpenInNew } from "@mui/icons-material";
import { getSafeTrackingUrl } from "../model/orderDetails";
import { OrderDetailsSection } from "./OrderDetailsSection";

export const OrderTracking = ({ deliveryUrl }: { deliveryUrl: string }) => {
  const rawTrackingUrl = deliveryUrl.trim();
  const trackingUrl = getSafeTrackingUrl(rawTrackingUrl);

  return (
    <OrderDetailsSection
      title="Отслеживание"
      icon={<LocalShippingOutlined />}
      testId="order-tracking"
    >
      {trackingUrl ? (
        <Stack spacing={1.25} alignItems="flex-start">
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ overflowWrap: "anywhere" }}
          >
            {trackingUrl}
          </Typography>
          <Button
            component="a"
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            endIcon={<OpenInNew />}
          >
            Отследить отправление
          </Button>
        </Stack>
      ) : (
        <Alert severity={rawTrackingUrl ? "warning" : "info"}>
          {rawTrackingUrl
            ? "Ссылка отслеживания имеет неподдерживаемый формат. Свяжитесь с продавцом."
            : "Продавец пока не добавил ссылку для отслеживания."}
        </Alert>
      )}
    </OrderDetailsSection>
  );
};
