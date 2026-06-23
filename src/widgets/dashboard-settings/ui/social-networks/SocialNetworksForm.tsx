import type React from "react";
import {
  Alert,
  Box,
  FormControl,
  Typography,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import type { DictionaryItem } from "@/entities/dictionary";
import type { SocialNetwork } from "@/shared/types";
import { SocialNetworksFormFooter } from "./SocialNetworksFormFooter";
import { SocialNetworksList } from "./SocialNetworksList";
import { useSocialNetworksForm } from "./useSocialNetworksForm";

interface SocialNetworksFormProps {
  types: DictionaryItem[];
  existing: SocialNetwork[];
}

export const SocialNetworksForm = ({
  types,
  existing,
}: SocialNetworksFormProps): React.ReactElement => {
  const form = useSocialNetworksForm({ types, existing });

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
        Выберите социальные сети и укажите ваши данные для связи. Эта информация будет видна покупателям.
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
            Социальные сети
          </Typography>

          <SocialNetworksList
            control={form.control}
            errors={form.errors}
            expandedItems={form.expandedItems}
            itemsData={form.itemsData}
            types={types}
            onMarkUnsaved={form.markUnsaved}
            onToggleExpand={form.toggleExpanded}
          />
        </FormControl>

        <SocialNetworksFormFooter
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
