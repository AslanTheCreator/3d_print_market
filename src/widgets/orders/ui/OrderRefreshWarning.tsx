import { Alert, Button } from "@mui/material";
import { useOrderActionsRecovery } from "../model/orderActionsContext";

export function OrderRefreshWarning() {
  const { actionsAvailable, retry, retryPending } = useOrderActionsRecovery();
  if (actionsAvailable) return null;
  return <Alert severity="warning" action={retry && <Button color="inherit" disabled={retryPending} onClick={retry}>Повторить загрузку</Button>}>
    Не удалось обновить заказы. Действия недоступны до успешной загрузки.
  </Alert>;
}
