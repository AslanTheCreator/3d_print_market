import type React from "react";
import { Stack } from "@mui/material";
import type { Control, FieldErrors } from "react-hook-form";
import type { DictionaryItem } from "@/entities/dictionary";
import { SocialNetworkCard } from "./SocialNetworkCard";
import type { SocialFormData, SocialFormItem } from "./model";

interface SocialNetworksListProps {
  disabled: boolean;
  existingKeys: Set<string>;
  control: Control<SocialFormData>;
  errors: FieldErrors<SocialFormData>;
  expandedItems: Set<string>;
  itemsData?: Record<string, SocialFormItem>;
  types: DictionaryItem[];
  onMarkUnsaved: () => void;
  onToggleExpand: (key: string) => void;
}

export const SocialNetworksList = ({
  disabled,
  existingKeys,
  control,
  errors,
  expandedItems,
  itemsData,
  types,
  onMarkUnsaved,
  onToggleExpand,
}: SocialNetworksListProps): React.ReactElement => {
  return (
    <Stack spacing={{ xs: 1.5, md: 2 }}>
      {types.map((network) => (
        <SocialNetworkCard
          key={network.value}
          disabled={disabled}
          willDelete={existingKeys.has(network.value) && !itemsData?.[network.value]?.enabled}
          control={control}
          errors={errors}
          isExpanded={expandedItems.has(network.value)}
          item={itemsData?.[network.value]}
          network={network}
          onMarkUnsaved={onMarkUnsaved}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </Stack>
  );
};
