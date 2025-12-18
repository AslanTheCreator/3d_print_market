"use client";

import React, { useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormControl,
  Grid,
  Collapse,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Telegram,
  Facebook,
  WhatsApp,
  ExpandMore,
  ExpandLess,
  InfoOutlined,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { useDictionary } from "@/entities/dictionary";
import {
  useUserSocialNetworks,
  useSaveSocialNetworksBatch,
} from "@/entities/social-networks";
import type { SocialNetworksCreateModel } from "@/entities/social-networks/model/types";
import { useNotification } from "@/app/providers";

interface FormData {
  networks: {
    [key: string]: {
      enabled: boolean;
      login: string;
    };
  };
}

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [expandedNetworks, setExpandedNetworks] = React.useState<Set<string>>(
    new Set()
  );

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
    defaultValues: { networks: {} },
  });

  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    if (
      socialNetworkTypes &&
      socialNetworkTypes.length > 0 &&
      userSocialNetworks &&
      !isInitialized
    ) {
      const networksData: FormData["networks"] = {};
      const expanded = new Set<string>();

      socialNetworkTypes.forEach((network) => {
        const existingNetwork = userSocialNetworks.find(
          (sn) => sn.type === network.value
        );

        if (existingNetwork) {
          networksData[network.value] = {
            enabled: true,
            login: existingNetwork.login,
          };
          expanded.add(network.value);
        } else {
          networksData[network.value] = {
            enabled: false,
            login: "",
          };
        }
      });

      setValue("networks", networksData, { shouldDirty: false });
      setExpandedNetworks(expanded);
      setIsInitialized(true);
    }
  }, [socialNetworkTypes, userSocialNetworks, isInitialized, setValue]);

  const networksData = watch("networks");

  const handleNetworkToggle = (networkValue: string) => {
    setExpandedNetworks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(networkValue)) {
        newSet.delete(networkValue);
      } else {
        newSet.add(networkValue);
      }
      return newSet;
    });
  };

  const onSubmit = async (data: FormData) => {
    const toCreate: SocialNetworksCreateModel[] = [];
    const toDelete: number[] = [];

    socialNetworkTypes?.forEach((network) => {
      const wasEnabled = userSocialNetworks.some(
        (sn) => sn.type === network.value
      );
      const nowEnabled = !!data.networks[network.value]?.enabled;

      if (nowEnabled && !wasEnabled) {
        toCreate.push({
          type: network.value as any,
          login: data.networks[network.value].login,
        });
      }

      if (!nowEnabled && wasEnabled) {
        const socialNetwork = userSocialNetworks.find(
          (sn) => sn.type === network.value
        );
        if (socialNetwork?.id) toDelete.push(socialNetwork.id);
      }
    });

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
              const isExpanded = expandedNetworks.has(network.value);
              const isEnabled = networksData?.[network.value]?.enabled || false;

              return (
                <Card
                  key={network.value}
                  sx={{
                    transition: "all 0.2s",
                    border: `2px solid ${
                      isEnabled
                        ? theme.palette.primary.main
                        : theme.palette.divider
                    }`,
                    boxShadow: isEnabled
                      ? `0 0 0 1px ${theme.palette.primary.main}`
                      : "none",
                    "&:hover": {
                      borderColor: theme.palette.primary.light,
                      boxShadow: `0 2px 8px ${theme.palette.action.hover}`,
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      p: { xs: 2, sm: 2.5 },
                      "&:last-child": { pb: { xs: 2, sm: 2.5 } },
                    }}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ cursor: "pointer" }}
                      onClick={() => {
                        if (isEnabled) handleNetworkToggle(network.value);
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={2} flex={1}>
                        <Controller
                          name={`networks.${network.value}.enabled`}
                          control={control}
                          render={({ field }) => (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  {...field}
                                  checked={field.value || false}
                                  onChange={(e) => {
                                    field.onChange(e.target.checked);
                                    if (e.target.checked) {
                                      handleNetworkToggle(network.value);
                                    } else {
                                      setExpandedNetworks((prev) => {
                                        const newSet = new Set(prev);
                                        newSet.delete(network.value);
                                        return newSet;
                                      });
                                    }
                                  }}
                                />
                              }
                              label=""
                              sx={{ m: 0 }}
                            />
                          )}
                        />
                        <Box
                          sx={{
                            color: isEnabled ? "primary.main" : "action.active",
                            display: { xs: "none", sm: "flex" },
                          }}
                        >
                          {getSocialIcon(network.value)}
                        </Box>
                        <Box flex={1}>
                          <Typography
                            variant="body1"
                            fontWeight={isEnabled ? 600 : 500}
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                          >
                            {network.description}
                          </Typography>
                        </Box>
                      </Box>
                      {isEnabled && (
                        <Box sx={{ ml: 1 }}>
                          {isExpanded ? <ExpandLess /> : <ExpandMore />}
                        </Box>
                      )}
                    </Box>

                    <Collapse in={isEnabled && isExpanded} timeout="auto">
                      <Box sx={{ mt: 3, pl: { xs: 0, sm: 7 } }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Controller
                              name={`networks.${network.value}.login`}
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
                                  label="Имя пользователя"
                                  placeholder={
                                    network.value === "VK"
                                      ? "@username или id123456"
                                      : network.value === "TELEGRAM"
                                      ? "@username"
                                      : network.value === "WHATSAPP"
                                      ? "+7 (000) 000-00-00"
                                      : "Имя пользователя"
                                  }
                                  error={
                                    !!errors.networks?.[network.value]?.login
                                  }
                                  helperText={
                                    errors.networks?.[network.value]?.login
                                      ?.message
                                  }
                                  size={isMobile ? "small" : "medium"}
                                />
                              )}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
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
              !Object.values(networksData || {}).some((n) => n.enabled)
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
