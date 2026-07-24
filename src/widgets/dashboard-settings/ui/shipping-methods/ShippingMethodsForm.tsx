import type React from "react";
import {
  Alert,
  Box,
  FormControl,
  Typography,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import type { DictionaryItem } from "@/entities/dictionary";
import type { Transfer } from "@/entities/transfer";
import { ShippingMethodsFormFooter } from "./ShippingMethodsFormFooter";
import { ShippingMethodsList } from "./ShippingMethodsList";
import { useShippingMethodsForm } from "./useShippingMethodsForm";

interface ShippingMethodsFormProps {
  methods: DictionaryItem[];
  currencies: DictionaryItem[];
  existing: Transfer[];
}

export const ShippingMethodsForm = ({
  methods,
  currencies,
  existing,
}: ShippingMethodsFormProps): React.ReactElement => {
  const form = useShippingMethodsForm({ methods, currencies, existing });

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
        Выберите способы отправки товара и укажите стоимость доставки.
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
            Способы доставки
          </Typography>

          <ShippingMethodsList
            control={form.control}
            currencies={currencies}
            currencyLabels={form.currencyLabels}
            errors={form.errors}
            expandedItems={form.expandedItems}
            itemsData={form.itemsData}
            methods={methods}
            onEnabledChange={form.handleEnabledChange}
            onMarkUnsaved={form.markUnsaved}
            onToggleExpand={form.toggleExpanded}
          />
        </FormControl>

        <ShippingMethodsFormFooter
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
