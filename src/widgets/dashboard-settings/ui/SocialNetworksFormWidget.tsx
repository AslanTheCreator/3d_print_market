"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Facebook,
  InfoOutlined,
  Telegram,
  WhatsApp,
} from "@mui/icons-material";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useDictionary } from "@/entities/dictionary";
import { useNotification } from "@/shared/ui/notification";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card";
import type { DictionaryItem } from "@/entities/dictionary";
import type { SocialNetwork, SocialNetworkType } from "@/shared/types";
import {
  useCreateSocial,
  useDeleteSocial,
  useUpdateSocial,
} from "../model/useSocialNetworkMutations";
import type { SocialNetworkInput } from "../model/types";
import { useSocialNetworks } from "../model/useSocialNetworks";

interface SocialFormItem {
  enabled: boolean;
  login: string;
}

interface SocialFormData {
  items: Record<string, SocialFormItem>;
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

function trimValue(value: string) {
  return value.trim();
}

function buildDefaultValues(
  types: DictionaryItem[],
  existing: SocialNetwork[],
): SocialFormData {
  const byType: Record<string, SocialNetwork> = {};
  for (const item of existing) {
    byType[item.type] = item;
  }

  const items: Record<string, SocialFormItem> = {};
  for (const type of types) {
    const found = byType[type.value];
    items[type.value] = {
      enabled: !!found,
      login: found?.login ?? "",
    };
  }

  return { items };
}

function buildInitialExpanded(
  types: DictionaryItem[],
  existing: SocialNetwork[],
): Set<string> {
  const existingTypes = new Set(existing.map((item) => item.type));
  const expanded = new Set<string>();

  for (const type of types) {
    if (existingTypes.has(type.value as SocialNetworkType)) {
      expanded.add(type.value);
    }
  }

  return expanded;
}

function getSocialBadge(item?: SocialFormItem) {
  if (!item?.enabled) {
    return <Chip size="small" label="Не включен" variant="outlined" />;
  }

  const login = trimValue(item.login);
  if (login) {
    return <Chip size="small" label={login} color="primary" variant="outlined" />;
  }

  return (
    <Chip
      size="small"
      label="Нужно указать логин"
      color="warning"
      variant="outlined"
    />
  );
}

interface SocialNetworksFormProps {
  types: DictionaryItem[];
  existing: SocialNetwork[];
}

const SocialNetworksForm: React.FC<SocialNetworksFormProps> = ({
  types,
  existing,
}) => {
  const { showNotification } = useNotification();
  const createMutation = useCreateSocial();
  const updateMutation = useUpdateSocial();
  const deleteMutation = useDeleteSocial();

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const existingByType = useMemo(() => {
    const map: Record<string, SocialNetwork> = {};
    for (const item of existing) {
      map[item.type] = item;
    }
    return map;
  }, [existing]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SocialFormData>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: buildDefaultValues(types, existing),
  });

  const [expandedItems, setExpandedItems] = useState<Set<string>>(() =>
    buildInitialExpanded(types, existing),
  );
  const [wasSaved, setWasSaved] = useState(false);

  const itemsData = useWatch({
    control,
    name: "items",
  });

  useEffect(() => {
    reset(buildDefaultValues(types, existing));
    setWasSaved(false);
  }, [existing, reset, types]);

  const toggleExpanded = useCallback((key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const hasChanges = useMemo(() => {
    if (!itemsData) return false;

    for (const [type, formItem] of Object.entries(itemsData)) {
      const prev = existingByType[type];
      const wasEnabled = !!prev;
      const nowEnabled = !!formItem.enabled;

      if (wasEnabled !== nowEnabled) {
        return true;
      }

      if (wasEnabled && nowEnabled) {
        if (trimValue(prev.login) !== trimValue(formItem.login)) {
          return true;
        }
      }
    }

    return false;
  }, [existingByType, itemsData]);

  const hasBlockingValidationErrors = useMemo(() => {
    if (!itemsData) return false;

    return Object.values(itemsData).some((item) => {
      if (!item.enabled) {
        return false;
      }

      return !trimValue(item.login);
    });
  }, [itemsData]);

  const canSubmit = hasChanges && !hasBlockingValidationErrors && !isPending;

  const statusText = useMemo(() => {
    if (isPending) {
      return "Сохраняем изменения...";
    }

    if (hasBlockingValidationErrors) {
      return "Заполните обязательные поля, чтобы сохранить изменения.";
    }

    if (hasChanges) {
      return "Есть несохраненные изменения.";
    }

    if (wasSaved) {
      return "Изменения сохранены.";
    }

    return "Изменений нет.";
  }, [hasBlockingValidationErrors, hasChanges, isPending, wasSaved]);

  const onSubmit = useCallback(
    async (data: SocialFormData) => {
      const operations: Promise<unknown>[] = [];

      for (const [type, formItem] of Object.entries(data.items)) {
        const prev = existingByType[type];
        const input: SocialNetworkInput = {
          type: type as SocialNetworkType,
          login: trimValue(formItem.login),
        };

        if (formItem.enabled) {
          if (prev) {
            if (trimValue(prev.login) !== input.login) {
              operations.push(updateMutation.mutateAsync({ id: prev.id, input }));
            }
          } else {
            operations.push(createMutation.mutateAsync(input));
          }
        } else if (prev) {
          operations.push(deleteMutation.mutateAsync(prev.id));
        }
      }

      if (operations.length === 0) {
        showNotification("Нет изменений для сохранения", "info");
        return;
      }

      try {
        await Promise.all(operations);
        setExpandedItems(new Set());
        setWasSaved(true);
        showNotification("Социальные сети сохранены", "success");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось сохранить изменения";
        showNotification(message, "error");
      }
    },
    [
      createMutation,
      deleteMutation,
      existingByType,
      showNotification,
      updateMutation,
    ],
  );

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

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
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

          <Stack spacing={2}>
            {types.map((network) => {
              const key = network.value;
              const isEnabled = itemsData?.[key]?.enabled ?? false;
              const isExpanded = expandedItems.has(key);

              return (
                <Controller
                  key={key}
                  name={`items.${key}.enabled`}
                  control={control}
                  render={({ field }) => (
                    <CollapsibleFormCard
                      value={key}
                      label={network.description}
                      badge={getSocialBadge(itemsData?.[key])}
                      icon={SOCIAL_ICONS[key] ?? <Telegram />}
                      isEnabled={field.value ?? false}
                      isExpanded={isExpanded}
                      onEnabledChange={(checked) => {
                        setWasSaved(false);
                        field.onChange(checked);
                      }}
                      onToggleExpand={() => toggleExpanded(key)}
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
                                  setWasSaved(false);
                                  loginField.onChange(event);
                                }}
                                fullWidth
                                label={SOCIAL_LABELS[key] ?? DEFAULT_LABEL}
                                placeholder={SOCIAL_PLACEHOLDERS[key] ?? "Имя пользователя"}
                                error={!!errors.items?.[key]?.login}
                                helperText={
                                  errors.items?.[key]?.login?.message ??
                                  "Эти данные будут видны покупателям"
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
            })}
          </Stack>
        </FormControl>

        <Box
          sx={{
            mt: 4,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography
            variant="body2"
            color={
              hasBlockingValidationErrors
                ? "error.main"
                : hasChanges
                  ? "text.primary"
                  : "text.secondary"
            }
          >
            {statusText}
          </Typography>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={!canSubmit}
            sx={{ minWidth: { xs: "100%", sm: 180 } }}
            startIcon={
              isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export const SocialNetworksFormWidget: React.FC = () => {
  const { data: socialNetworkTypes, isLoading: typesLoading } =
    useDictionary("SOCIAL_NETWORK");
  const { data: socialNetworks = [], isLoading: networksLoading } =
    useSocialNetworks();

  const isLoading = typesLoading || networksLoading;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (!socialNetworkTypes?.length) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить социальные сети. Попробуйте обновить страницу.
      </Alert>
    );
  }

  return <SocialNetworksForm types={socialNetworkTypes} existing={socialNetworks} />;
};
