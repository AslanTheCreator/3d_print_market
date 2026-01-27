"use client";

import React, { useEffect } from "react";
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
  useSocialNetworks,
  useCreateSocial,
  useUpdateSocial,
  useDeleteSocial,
  type SocialNetwork,
  type SocialNetworkType,
} from "@/entities/social-networks";
import { useNotification } from "@/app/providers";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card";

// Тип данных для одной соцсети в форме
interface SocialFormItem {
  enabled: boolean;
  login: string;
}

// Тип всей формы
interface SocialFormData {
  items: Record<string, SocialFormItem>;
}

// Иконки для соцсетей
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

// Плейсхолдеры для разных соцсетей
const SOCIAL_PLACEHOLDERS: Record<string, string> = {
  VK: "@username или id123456",
  TELEGRAM: "@username",
  WHATSAPP: "+7 (000) 000-00-00",
  FACEBOOK: "Имя пользователя",
};

// Лейблы для полей ввода
const SOCIAL_LABELS: Record<string, string> = {
  WHATSAPP: "Номер телефона",
  DEFAULT: "Имя пользователя",
};

export const SocialNetworksFormWidget: React.FC = () => {
  // Data fetching
  const { data: socialNetworkTypes, isLoading: typesLoading } =
    useDictionary("SOCIAL_NETWORK");
  const { data: socialNetworks = [], isLoading: networksLoading } =
    useSocialNetworks();

  // Mutations
  const createMutation = useCreateSocial();
  const updateMutation = useUpdateSocial();
  const deleteMutation = useDeleteSocial();

  const { showNotification } = useNotification();

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  // Маппинг существующих соцсетей по типу
  const socialsByType = React.useMemo(() => {
    return socialNetworks.reduce<Record<string, SocialNetwork>>((acc, s) => {
      acc[s.type] = s;
      return acc;
    }, {});
  }, [socialNetworks]);

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<SocialFormData>({
    mode: "onChange",
    defaultValues: { items: {} },
  });

  // Состояние раскрытых карточек
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(
    new Set(),
  );

  const toggleExpanded = React.useCallback((key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Инициализация формы при загрузке данных
  useEffect(() => {
    if (!socialNetworkTypes?.length || networksLoading) return;

    const formData: Record<string, SocialFormItem> = {};
    const expanded = new Set<string>();

    socialNetworkTypes.forEach((type) => {
      const existing = socialsByType[type.value];

      if (existing) {
        formData[type.value] = {
          enabled: true,
          login: existing.login,
        };
        expanded.add(type.value);
      } else {
        formData[type.value] = {
          enabled: false,
          login: "",
        };
      }
    });

    reset({ items: formData }, { keepDirty: false });
    setExpandedItems(expanded);
  }, [socialNetworkTypes, socialsByType, networksLoading, reset]);

  const itemsData = watch("items");

  // Сохранение формы
  const onSubmit = async (data: SocialFormData) => {
    const operations: Promise<void>[] = [];

    for (const [type, formItem] of Object.entries(data.items)) {
      const existing = socialsByType[type];

      const input = {
        type: type as SocialNetworkType,
        login: formItem.login,
      };

      if (formItem.enabled) {
        if (existing) {
          // Обновляем только если есть изменения
          const hasChanges = existing.login !== input.login;

          if (hasChanges) {
            operations.push(
              updateMutation
                .mutateAsync({ id: existing.id, input })
                .then(() => {}),
            );
          }
        } else {
          // Создаём новый
          operations.push(createMutation.mutateAsync(input).then(() => {}));
        }
      } else if (existing) {
        // Удаляем выключенный
        operations.push(deleteMutation.mutateAsync(existing.id));
      }
    }

    if (operations.length === 0) {
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
  };

  // Loading state
  if (networksLoading || typesLoading) {
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

  // Error state
  if (!socialNetworkTypes?.length) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить социальные сети. Попробуйте обновить страницу.
      </Alert>
    );
  }

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
            {socialNetworkTypes.map((network) => {
              const networkKey = network.value;
              const isEnabled = itemsData?.[networkKey]?.enabled ?? false;
              const isExpanded = expandedItems.has(networkKey);

              return (
                <Controller
                  key={networkKey}
                  name={`items.${networkKey}.enabled`}
                  control={control}
                  render={({ field }) => (
                    <CollapsibleFormCard
                      value={networkKey}
                      label={network.description}
                      icon={SOCIAL_ICONS[networkKey] || <Telegram />}
                      isEnabled={field.value ?? false}
                      isExpanded={isExpanded}
                      onEnabledChange={field.onChange}
                      onToggleExpand={() => toggleExpanded(networkKey)}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Controller
                            name={`items.${networkKey}.login`}
                            control={control}
                            rules={{
                              required: isEnabled
                                ? "Укажите имя пользователя"
                                : false,
                            }}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label={
                                  SOCIAL_LABELS[networkKey] ||
                                  SOCIAL_LABELS.DEFAULT
                                }
                                placeholder={
                                  SOCIAL_PLACEHOLDERS[networkKey] ||
                                  "Имя пользователя"
                                }
                                error={!!errors.items?.[networkKey]?.login}
                                helperText={
                                  errors.items?.[networkKey]?.login?.message
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

        <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isPending || !isDirty}
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
