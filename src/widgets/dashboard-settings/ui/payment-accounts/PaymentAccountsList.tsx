import type React from "react";
import { Stack } from "@mui/material";
import type { Control, FieldErrors } from "react-hook-form";
import type { DictionaryItem } from "@/entities/dictionary";
import { PaymentAccountCard } from "./PaymentAccountCard";
import type { AccountFormData, AccountFormItem } from "./model";

interface PaymentAccountsListProps {
  disabled: boolean;
  existingKeys: Set<string>;
  control: Control<AccountFormData>;
  errors: FieldErrors<AccountFormData>;
  expandedItems: Set<string>;
  itemsData?: Record<string, AccountFormItem>;
  methods: DictionaryItem[];
  onMarkUnsaved: () => void;
  onToggleExpand: (key: string) => void;
}

export const PaymentAccountsList = ({
  disabled,
  existingKeys,
  control,
  errors,
  expandedItems,
  itemsData,
  methods,
  onMarkUnsaved,
  onToggleExpand,
}: PaymentAccountsListProps): React.ReactElement => {
  return (
    <Stack spacing={{ xs: 1.5, md: 2 }}>
      {methods.map((method) => (
        <PaymentAccountCard
          key={method.value}
          disabled={disabled}
          willDelete={existingKeys.has(method.value) && !itemsData?.[method.value]?.enabled}
          control={control}
          errors={errors}
          isExpanded={expandedItems.has(method.value)}
          item={itemsData?.[method.value]}
          method={method}
          onMarkUnsaved={onMarkUnsaved}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </Stack>
  );
};
