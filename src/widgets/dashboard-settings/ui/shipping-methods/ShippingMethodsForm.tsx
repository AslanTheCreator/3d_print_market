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
  unavailable: boolean;
  refresh: () => Promise<Transfer[]>;
}

export const ShippingMethodsForm = ({
  methods,
  currencies,
  existing,
  refresh,
  unavailable,
}: ShippingMethodsFormProps): React.ReactElement => {
  const form = useShippingMethodsForm({ methods, currencies, existing, refresh });

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
        Выберите способы отправки товара и укажите стоимость доставки.
      </Alert>

      <Typography color="text.secondary" variant="body2" sx={{ display: { xs: "block", md: "none" }, mb: 2 }}>Как вы отправляете проданные товары. Выберите способы и стоимость доставки.</Typography>
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
            Способы доставки
          </Typography>

          <ShippingMethodsList
            disabled={form.isPending || form.needsRefresh || unavailable}
            existingKeys={form.existingKeys}
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
