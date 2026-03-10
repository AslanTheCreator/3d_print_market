"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  FormControl,
  Grid,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Telegram,
  Facebook,
  WhatsApp,
  InfoOutlined,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { useDictionary } from "@/entities/dictionary";
import {
  useCreateSocial,
  useUpdateSocial,
  useDeleteSocial,
} from "../model/useSocialNetworkMutations";
import type { SocialNetworkInput } from "../model/types";
import { useSocialNetworks } from "../model/useSocialNetworks";
import { useNotification } from "@/app/providers";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card";
import type { DictionaryItem } from "@/entities/dictionary";
import { SocialNetwork, SocialNetworkType } from "@/shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SocialFormItem {
  enabled: boolean;
  login: string;
}

interface SocialFormData {
  items: Record<string, SocialFormItem>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Строит начальные значения формы из словаря и существующих данных.
 * Вызывается ОДИН раз перед монтированием формы.
 */
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

/**
 * Определяет начально раскрытые карточки (те, что enabled).
 */
function buildInitialExpanded(
  types: DictionaryItem[],
  existing: SocialNetwork[],
): Set<string> {
  const existingTypes = new Set(existing.map((s) => s.type));
  const expanded = new Set<string>();
  for (const type of types) {
    if (existingTypes.has(type.value as SocialNetworkType)) {
      expanded.add(type.value);
    }
  }
  return expanded;
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Component (рендерится ТОЛЬКО когда данные уже загружены)
// ─────────────────────────────────────────────────────────────────────────────

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

  // Маппинг существующих соцсетей по типу — для submit
  const existingByType = useMemo(() => {
    const map: Record<string, SocialNetwork> = {};
    for (const item of existing) {
      map[item.type] = item;
    }
    return map;
  }, [existing]);

  // defaultValues вычисляются ОДИН раз при создании компонента
  // (types и existing приходят уже загруженными из родителя)
  const [defaultValues] = useState(() => buildDefaultValues(types, existing));

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SocialFormData>({
    mode: "onChange",
    defaultValues,
  });

  // Раскрытые карточки — локальное состояние
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() =>
    buildInitialExpanded(types, existing),
  );

  const toggleExpanded = useCallback((key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const itemsData = watch("items");

  // ─────────────────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────────────────

  const onSubmit = useCallback(
    async (data: SocialFormData) => {
      const operations: Promise<unknown>[] = [];

      for (const [type, formItem] of Object.entries(data.items)) {
        const prev = existingByType[type];
        const input: SocialNetworkInput = {
          type: type as SocialNetworkType,
          login: formItem.login,
        };

        if (formItem.enabled) {
          if (prev) {
            // Обновляем только если login изменился
            if (prev.login !== formItem.login) {
              operations.push(
                updateMutation.mutateAsync({ id: prev.id, input }),
              );
            }
          } else {
            operations.push(createMutation.mutateAsync(input));
          }
        } else if (prev) {
          // Была включена, теперь выключена → удаляем
          operations.push(deleteMutation.mutateAsync(prev.id));
        }
      }

      if (operations.length === 0) {
        showNotification("Нет изменений для сохранения", "info");
        return;
      }

      try {
        await Promise.all(operations);
        showNotification("Социальные сети сохранены", "success");
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Не удалось сохранить изменения";
        showNotification(msg, "error");
      }
    },
    [
      existingByType,
      createMutation,
      updateMutation,
      deleteMutation,
      showNotification,
    ],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

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
        Выберите социальные сети и укажите ваши данные для связи. Эта информация
        будет видна покупателям.
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
            Выберите социальные сети
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
                      icon={SOCIAL_ICONS[key] ?? <Telegram />}
                      isEnabled={field.value ?? false}
                      isExpanded={isExpanded}
                      onEnabledChange={field.onChange}
                      onToggleExpand={() => toggleExpanded(key)}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Controller
                            name={`items.${key}.login`}
                            control={control}
                            rules={{
                              required: isEnabled
                                ? "Укажите имя пользователя"
                                : false,
                            }}
                            render={({ field: loginField }) => (
                              <TextField
                                {...loginField}
                                value={loginField.value ?? ""}
                                fullWidth
                                label={SOCIAL_LABELS[key] ?? DEFAULT_LABEL}
                                placeholder={
                                  SOCIAL_PLACEHOLDERS[key] ?? "Имя пользователя"
                                }
                                error={!!errors.items?.[key]?.login}
                                helperText={errors.items?.[key]?.login?.message}
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

        <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={
              isPending ||
              !Object.values(itemsData || {}).some((n) => n.enabled)
            }
            sx={{ minWidth: { xs: "100%", sm: 180 } }}
            startIcon={isPending ? <CircularProgress size={16} /> : undefined}
          >
            {isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Loader Component (публичный экспорт)
// ─────────────────────────────────────────────────────────────────────────────

export const SocialNetworksFormWidget: React.FC = () => {
  const { data: socialNetworkTypes, isLoading: typesLoading } =
    useDictionary("SOCIAL_NETWORK");
  const { data: socialNetworks = [], isLoading: networksLoading } =
    useSocialNetworks();

  const isLoading = typesLoading || networksLoading;

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
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

  // Форма рендерится ТОЛЬКО когда данные готовы →
  // defaultValues вычисляются корректно, без useEffect
  return (
    <SocialNetworksForm types={socialNetworkTypes} existing={socialNetworks} />
  );
};
