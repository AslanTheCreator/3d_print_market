import type React from "react";
import {
  Alert,
  Box,
  FormControl,
  Typography,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import type { DictionaryItem } from "@/entities/dictionary";
import type { SocialNetwork } from "@/entities/social-network";
import { SocialNetworksFormFooter } from "./SocialNetworksFormFooter";
import { SocialNetworksList } from "./SocialNetworksList";
import { useSocialNetworksForm } from "./useSocialNetworksForm";

interface SocialNetworksFormProps {
  types: DictionaryItem[];
  existing: SocialNetwork[];
  unavailable: boolean;
  refresh: () => Promise<SocialNetwork[]>;
}

export const SocialNetworksForm = ({
  types,
  existing,
  refresh,
  unavailable,
}: SocialNetworksFormProps): React.ReactElement => {
  const form = useSocialNetworksForm({ types, existing, refresh });

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
        Выберите социальные сети и укажите ваши данные для связи. Эта информация будет видна покупателям.
      </Alert>

      <Typography color="text.secondary" variant="body2" sx={{ display: { xs: "block", md: "none" }, mb: 2 }}>Как покупатели могут связаться с вами. Контакты будут видны покупателям.</Typography>
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
            Социальные сети
          </Typography>

          <SocialNetworksList
            disabled={form.isPending || form.needsRefresh || unavailable}
            existingKeys={form.existingKeys}
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
