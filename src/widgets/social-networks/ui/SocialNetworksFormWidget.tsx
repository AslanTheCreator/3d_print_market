"use client";

import React from "react";
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
  useUserSocialNetworks,
  useSaveSocialNetworksBatch,
  SocialNetworkType,
} from "@/entities/social-networks";
import type { SocialNetworksCreateModel } from "@/entities/social-networks/model/types";
import { useNotification } from "@/app/providers";
import { CollapsibleFormCard } from "@/shared/ui/collapsible-form-card/CollapsibleFormCard";
import { useBatchForm } from "@/shared/hooks/useBatchForm";
import { useFormInitializer } from "@/shared/hooks/useFormInitializer";

interface FormData {
  items: {
    [key: string]: {
      enabled: boolean;
      login: string;
    };
  };
}

// Иконки для разных соцсетей
const getSocialIcon = (value: string) => {
  switch (value) {
    case "VK":
      return (
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
      );
    case "FACEBOOK":
      return <Facebook />;
    case "TELEGRAM":
      return <Telegram />;
    case "WHATSAPP":
      return <WhatsApp />;
    default:
      return <Telegram />;
  }
};

export const SocialNetworksFormWidget = () => {
  const { data: socialNetworkTypes, isLoading: typesLoading } =
    useDictionary("SOCIAL_NETWORK");
  const { data: userSocialNetworks = [], isLoading: networksLoading } =
    useUserSocialNetworks();
  const { mutateAsync: saveBatch, isPending } = useSaveSocialNetworksBatch();
  const { showNotification } = useNotification();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: { items: {} },
  });

  // Используем переиспользуемый хук для batch операций
  const { toggleExpanded, isExpanded, computeChanges, initialExpandedKeys } =
    useBatchForm({
      existingItems: userSocialNetworks,
      getItemKey: (item) => item.type,
      mapToCreateModel: (data, key) => ({
        type: key as SocialNetworkType,
        login: data.login,
      }),
      getItemId: (item) => item.id,
    });

  // Инициализация формы
  useFormInitializer({
    dictionaryItems: socialNetworkTypes,
    existingItems: userSocialNetworks,
    isLoading: networksLoading,
    setValue,
    getDictionaryKey: (item) => item.value,
    getExistingKey: (item) => item.type,
    mapExistingToFormData: (item) => ({ login: item.login }),
    getDefaultFormData: () => ({ login: "" }),
    onInitialized: (expanded) => {
      expanded.forEach((key) => toggleExpanded(key));
    },
  });

  const itemsData = watch("items");

  const onSubmit = async (data: FormData) => {
    const { toCreate, toDelete } = computeChanges(data.items);

    if (toCreate.length === 0 && toDelete.length === 0) {
      showNotification("Ничего не изменилось", "info");
      return;
    }

    await saveBatch({ toCreate, toDelete });
  };

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

  if (!socialNetworkTypes || !socialNetworkTypes.length) {
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
              const isEnabled = itemsData?.[network.value]?.enabled || false;

              return (
                <Controller
                  key={network.value}
                  name={`items.${network.value}.enabled`}
                  control={control}
                  render={({ field }) => (
                    <CollapsibleFormCard
                      value={network.value}
                      label={network.description}
                      icon={getSocialIcon(network.value)}
                      isEnabled={field.value || false}
                      isExpanded={isExpanded(network.value)}
                      onEnabledChange={field.onChange}
                      onToggleExpand={() => toggleExpanded(network.value)}
                    >
                      {/* Поля внутри карточки */}
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Controller
                            name={`items.${network.value}.login`}
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
                                  network.value === "WHATSAPP"
                                    ? "Номер телефона"
                                    : "Имя пользователя"
                                }
                                placeholder={
                                  network.value === "VK"
                                    ? "@username или id123456"
                                    : network.value === "TELEGRAM"
                                    ? "@username"
                                    : network.value === "WHATSAPP"
                                    ? "+7 (000) 000-00-00"
                                    : "Имя пользователя"
                                }
                                error={!!errors.items?.[network.value]?.login}
                                helperText={
                                  errors.items?.[network.value]?.login?.message
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
