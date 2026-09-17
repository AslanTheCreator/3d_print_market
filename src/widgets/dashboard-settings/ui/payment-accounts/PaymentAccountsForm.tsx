import type React from "react";
import {
  Alert,
  Box,
  FormControl,
  Typography,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import type { DictionaryItem } from "@/entities/dictionary";
import type { AccountsBaseModel } from "@/entities/account";
import { PaymentAccountsFormFooter } from "./PaymentAccountsFormFooter";
import { PaymentAccountsList } from "./PaymentAccountsList";
import { usePaymentAccountsForm } from "./usePaymentAccountsForm";

interface PaymentAccountsFormProps {
  methods: DictionaryItem[];
  existing: AccountsBaseModel[];
  unavailable: boolean;
  refresh: () => Promise<AccountsBaseModel[]>;
}

export const PaymentAccountsForm = ({
  methods,
  existing,
  refresh,
  unavailable,
}: PaymentAccountsFormProps): React.ReactElement => {
  const form = usePaymentAccountsForm({ methods, existing, refresh });

  return (
    <Box>
      <Alert
        severity="info"
        icon={<InfoOutlined />}
        sx={{
          display: { xs: "none", md: "flex" },
          mb: 3,
          borderRadius: 2,
          "& .MuiAlert-message": {
            fontSize: { xs: "0.813rem", sm: "0.875rem" },
          },
        }}
      >
        Выберите способы оплаты товара и укажите необходимую информацию. Эти данные будут видны покупателям.
      </Alert>

      <Typography color="text.secondary" variant="body2" sx={{ display: { xs: "block", md: "none" }, mb: 2 }}>Как покупатели платят вам. Реквизиты будут видны покупателям.</Typography>
      <Box component="form" onSubmit={unavailable ? (event) => event.preventDefault() : form.handleSubmit(form.onSubmit)}>
        <FormControl component="fieldset" fullWidth disabled={form.isPending || form.needsRefresh || unavailable}>
          <Typography
            component="legend"
            sx={{
              display: { xs: "none", md: "block" },
              mb: 2,
              fontSize: { xs: "1rem", sm: "1.125rem" },
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            Способы оплаты
          </Typography>

          <PaymentAccountsList
            disabled={form.isPending || form.needsRefresh || unavailable}
            existingKeys={form.existingKeys}
            control={form.control}
            errors={form.errors}
            expandedItems={form.expandedItems}
            itemsData={form.itemsData}
            methods={methods}
            onMarkUnsaved={form.markUnsaved}
            onToggleExpand={form.toggleExpanded}
          />
        </FormControl>

        <PaymentAccountsFormFooter
          canSubmit={form.canSubmit && !unavailable}
          hasBlockingValidationErrors={form.hasBlockingValidationErrors}
          hasChanges={form.hasChanges}
          isPending={form.isPending}
          statusText={form.statusText}
          saveError={form.saveError}
          needsRefresh={form.needsRefresh}
          onRetry={() => { void form.retryRefresh(); }}
        />
      </Box>
    </Box>
  );
};
