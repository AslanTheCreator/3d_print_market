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
}

export const PaymentAccountsForm = ({
  methods,
  existing,
}: PaymentAccountsFormProps): React.ReactElement => {
  const form = usePaymentAccountsForm({ methods, existing });

  return (
    <Box>
      <Alert
        severity="info"
        icon={<InfoOutlined />}
        sx={{
          mb: 3,
          borderRadius: 2,
          "& .MuiAlert-message": {
            fontSize: { xs: "0.813rem", sm: "0.875rem" },
          },
        }}
      >
        Выберите способы оплаты товара и укажите необходимую информацию. Эти данные будут видны покупателям.
      </Alert>

      <Box component="form" onSubmit={form.handleSubmit(form.onSubmit)}>
        <FormControl component="fieldset" fullWidth>
          <Typography
            component="legend"
            sx={{
              mb: 2,
              fontSize: { xs: "1rem", sm: "1.125rem" },
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            Способы оплаты
          </Typography>

          <PaymentAccountsList
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
          canSubmit={form.canSubmit}
          hasBlockingValidationErrors={form.hasBlockingValidationErrors}
          hasChanges={form.hasChanges}
          isPending={form.isPending}
          statusText={form.statusText}
        />
      </Box>
    </Box>
  );
};
