import type React from "react";
import { Stack } from "@mui/material";
import type { Control, FieldErrors } from "react-hook-form";
import type { DictionaryItem } from "@/entities/dictionary";
import { ShippingMethodCard } from "./ShippingMethodCard";
import type { TransferFormData, TransferFormItem } from "./model";

interface ShippingMethodsListProps {
  control: Control<TransferFormData>;
  currencies: DictionaryItem[];
  currencyLabels: Record<string, string>;
  errors: FieldErrors<TransferFormData>;
  expandedItems: Set<string>;
  itemsData?: Record<string, TransferFormItem>;
  methods: DictionaryItem[];
  onEnabledChange: (
    key: string,
    checked: boolean,
    onChange: (value: boolean) => void,
  ) => void;
  onMarkUnsaved: () => void;
  onToggleExpand: (key: string) => void;
}

export const ShippingMethodsList = ({
  control,
  currencies,
  currencyLabels,
  errors,
  expandedItems,
  itemsData,
  methods,
  onEnabledChange,
  onMarkUnsaved,
  onToggleExpand,
}: ShippingMethodsListProps): React.ReactElement => {
  return (
    <Stack spacing={2}>
      {methods.map((method) => (
        <ShippingMethodCard
          key={method.value}
          control={control}
          currencies={currencies}
          currencyLabels={currencyLabels}
          errors={errors}
          isExpanded={expandedItems.has(method.value)}
          item={itemsData?.[method.value]}
          method={method}
          onEnabledChange={onEnabledChange}
          onMarkUnsaved={onMarkUnsaved}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </Stack>
  );
};
