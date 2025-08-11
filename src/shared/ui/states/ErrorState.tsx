import React from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  useTheme,
  useMediaQuery,
  Button,
  SvgIconProps,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import InventoryIcon from "@mui/icons-material/Inventory";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import RefreshIcon from "@mui/icons-material/Refresh";

export type ErrorStateType =
  | "cart"
  | "products"
  | "profile"
  | "search"
  | "network"
  | "generic";

const errorConfigs: Record<
  ErrorStateType,
  {
    icon: React.ComponentType<SvgIconProps>;
    title: string;
    description: string;
    retryText: string;
  }
> = {
  cart: {
    icon: ShoppingCartIcon,
    title: "Не удалось загрузить корзину",
    description:
      "Произошла ошибка при загрузке корзины. Проверьте подключение к интернету и попробуйте еще раз.",
    retryText: "Повторить",
  },
  products: {
    icon: InventoryIcon,
    title: "Не удалось загрузить товары",
    description:
      "Не получается загрузить список товаров. Возможно, проблема с подключением к серверу.",
    retryText: "Обновить",
  },
  profile: {
    icon: PersonIcon,
    title: "Не удалось загрузить профиль",
    description:
      "Произошла ошибка при загрузке данных профиля. Проверьте авторизацию и попробуйте снова.",
    retryText: "Повторить",
  },
  search: {
    icon: SearchIcon,
    title: "Ошибка поиска",
    description:
      "Не удалось выполнить поиск. Проверьте введенный запрос и попробуйте еще раз.",
    retryText: "Найти снова",
  },
  network: {
    icon: WifiOffIcon,
    title: "Нет подключения к интернету",
    description:
      "Проверьте подключение к интернету и убедитесь, что у вас есть доступ к сети.",
    retryText: "Повторить",
  },
  generic: {
    icon: ErrorOutlineIcon,
    title: "Что-то пошло не так",
    description:
      "Произошла непредвиденная ошибка. Пожалуйста, попробуйте еще раз позже.",
    retryText: "Повторить",
  },
};

interface ErrorStateProps {
  type?: ErrorStateType;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryText?: string;
  /** Скрыть кнопку повтора */
  hideRetry?: boolean;
  /** Минимальная высота контейнера */
  minHeight?: string | number;
  /** Размер иконки */
  iconSize?: "small" | "medium" | "large";
  /** Дополнительные действия */
  actions?: React.ReactNode;
  /** Использовать контейнер или нет */
  useContainer?: boolean;
}

const getIconSize = (size: "small" | "medium" | "large", isMobile: boolean) => {
  const sizes = {
    small: isMobile ? 48 : 56,
    medium: isMobile ? 64 : 80,
    large: isMobile ? 80 : 96,
  };
  return sizes[size];
};

export const ErrorState = ({
  type = "generic",
  title,
  description,
  onRetry,
  retryText,
  hideRetry = false,
  minHeight = 400,
  iconSize = "medium",
  actions,
  useContainer = true,
}: ErrorStateProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Получаем конфигурацию на основе типа
  const config = errorConfigs[type];

  // Определяем финальные значения с приоритетом пропсов
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalIcon = config.icon;
  const finalRetryText = retryText || config.retryText;

  const IconComponent = finalIcon;

  const content = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight={minHeight}
      textAlign="center"
      gap={3}
      px={useContainer ? 0 : 2}
    >
      <IconComponent
        sx={{
          fontSize: getIconSize(iconSize, isMobile),
          color: theme.palette.error.main,
          opacity: 0.8,
        }}
      />

      <Stack spacing={2} alignItems="center" maxWidth={500}>
        <Typography
          variant={isMobile ? "h6" : "h5"}
          fontWeight={700}
          color="text.primary"
          gutterBottom={false}
        >
          {finalTitle}
        </Typography>

        <Typography
          variant={isMobile ? "body2" : "body1"}
          color="text.secondary"
          sx={{
            lineHeight: 1.6,
            maxWidth: 400,
            textAlign: "center",
          }}
        >
          {finalDescription}
        </Typography>
      </Stack>

      {/* Стандартные действия */}
      {!hideRetry && onRetry && (
        <Button
          color="error"
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          size={isMobile ? "medium" : "large"}
          sx={{
            textTransform: "none",
            minWidth: 120,
          }}
        >
          {finalRetryText}
        </Button>
      )}

      {/* Дополнительные действия */}
      {actions && (
        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={2}
          alignItems="center"
        >
          {actions}
        </Stack>
      )}
    </Box>
  );

  if (useContainer) {
    return <Container sx={{ mt: 2 }}>{content}</Container>;
  }

  return content;
};
