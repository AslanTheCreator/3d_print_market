import type React from "react";
import { Stack } from "@mui/material";
import type { Control, FieldErrors } from "react-hook-form";
import type { DictionaryItem } from "@/entities/dictionary";
import { ShippingMethodCard } from "./ShippingMethodCard";
import type { TransferFormData, TransferFormItem } from "./model";

interface ShippingMethodsListProps {
  disabled: boolean;
  existingKeys: Set<string>;
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
  disabled,
  existingKeys,
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
    <Stack spacing={{ xs: 1.5, md: 2 }}>
      {methods.map((method) => (
        <ShippingMethodCard
          key={method.value}
          disabled={disabled}
          willDelete={existingKeys.has(method.value) && !itemsData?.[method.value]?.enabled}
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
