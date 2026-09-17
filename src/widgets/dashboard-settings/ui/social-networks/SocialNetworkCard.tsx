import type React from "react";
import { Facebook, Telegram, WhatsApp } from "@mui/icons-material";
import { Box, Grid, TextField } from "@mui/material";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import type { DictionaryItem } from "@/entities/dictionary";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card";
import { SocialNetworkBadge } from "./SocialNetworkBadge";
import { trimValue, type SocialFormData, type SocialFormItem } from "./model";

interface SocialNetworkCardProps {
  disabled: boolean;
  willDelete: boolean;
  control: Control<SocialFormData>;
  errors: FieldErrors<SocialFormData>;
  isExpanded: boolean;
  item?: SocialFormItem;
  network: DictionaryItem;
  onMarkUnsaved: () => void;
  onToggleExpand: (key: string) => void;
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  VK: (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        fontWeight: 700,
        fontSize: "1rem",
      }}
    >
      VK
    </Box>
  ),
  FACEBOOK: <Facebook />,
  TELEGRAM: <Telegram />,
  WHATSAPP: <WhatsApp />,
};

const SOCIAL_PLACEHOLDERS: Record<string, string> = {
  VK: "@username или id123456",
  TELEGRAM: "@username",
  WHATSAPP: "+7 (000) 000-00-00",
  FACEBOOK: "Имя пользователя",
};

const SOCIAL_LABELS: Record<string, string> = {
  WHATSAPP: "Номер телефона",
};

const DEFAULT_LABEL = "Имя пользователя";

export const SocialNetworkCard = ({
  disabled,
  willDelete,
  control,
  errors,
  isExpanded,
  item,
  network,
  onMarkUnsaved,
  onToggleExpand,
}: SocialNetworkCardProps): React.ReactElement => {
  const key = network.value;
  const isEnabled = item?.enabled ?? false;

  return (
    <Controller
      name={`items.${key}.enabled`}
      control={control}
      render={({ field }) => (
        <CollapsibleFormCard
          disabled={disabled}
          notice={willDelete ? "Будет удалено после сохранения" : undefined}
          value={key}
          label={network.description}
          mobileLabel={{ TELEGRAM: "Telegram", VK: "ВКонтакте", FACEBOOK: "Facebook", WHATSAPP: "WhatsApp" }[key]}
          badge={<SocialNetworkBadge item={item} />}
          icon={SOCIAL_ICONS[key] ?? <Telegram />}
          isEnabled={field.value ?? false}
          isExpanded={isExpanded}
          onEnabledChange={(checked) => {
            onMarkUnsaved();
            field.onChange(checked);
          }}
          onToggleExpand={() => onToggleExpand(key)}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller
                name={`items.${key}.login`}
                control={control}
                rules={{
                  validate: (value) => {
                    if (!isEnabled) {
                      return true;
                    }

                    return !!trimValue(value ?? "") || "Укажите имя пользователя";
                  },
                }}
                render={({ field: loginField }) => (
                  <TextField
                    {...loginField}
                    value={loginField.value ?? ""}
                    onChange={(event) => {
                      onMarkUnsaved();
                      loginField.onChange(event);
                    }}
                    disabled={disabled}
                    fullWidth
                    inputProps={{ inputMode: key === "WHATSAPP" ? "tel" : "text", autoCapitalize: "none", spellCheck: false }}
                    autoComplete="off"
                    label={SOCIAL_LABELS[key] ?? DEFAULT_LABEL}
                    placeholder={SOCIAL_PLACEHOLDERS[key] ?? "Имя пользователя"}
                    error={!!errors.items?.[key]?.login}
                    helperText={
                      errors.items?.[key]?.login?.message
                    }
                  />
                )}
              />
            </Grid>
          </Grid>
        </CollapsibleFormCard>
      )}
    />
  );
};
