import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  Stack,
  IconButton,
  useTheme,
  useMediaQuery,
  Typography,
  Box,
  alpha,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PersonCustomIcon from "@/shared/assets/icons/userAccount.svg";
import ShoppingCartCustomIcon from "@/shared/assets/icons/backet.svg";
import { FavoriteBorderOutlined } from "@mui/icons-material";

export const HeaderActions = () => {
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/auth/login");
    }
  };

  // Адаптивные размеры иконок
  const iconSize = isMobile ? 28 : 24;

  const headerIcons = [
    {
      url: "/favorites",
      icon: (
        <FavoriteBorderOutlined
          sx={{
            fontSize: iconSize,
            color: theme.palette.common.white,
          }}
        />
      ),
      label: "Избранное",
      oncClick: undefined,
    },
    {
      url: "/auth/login",
      icon: (
        <Image
          src={PersonCustomIcon}
          alt="Профиль"
          width={iconSize}
          height={iconSize}
          style={{
            objectFit: "contain",
          }}
        />
      ),
      label: "Профиль",
      onClick: handleProfileClick,
    },
    {
      url: "/cart",
      icon: (
        <Image
          src={ShoppingCartCustomIcon}
          alt="Корзина"
          width={iconSize}
          height={iconSize}
          style={{
            objectFit: "contain",
          }}
        />
      ),
      label: "Корзина",
      onClick: undefined,
    },
  ];

  return (
    <Stack
      direction="row"
      spacing={isMobile ? 0.5 : 1}
      alignItems="center"
      sx={{
        minHeight: { xs: 40, sm: 50 },
      }}
    >
      {headerIcons.map(({ url, icon, label, onClick }, index) => (
        <Link
          key={index}
          href={url}
          passHref
          style={{ textDecoration: "none" }}
          onClick={onClick}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.75,
              minWidth: { xs: 40, sm: 64 },
            }}
          >
            <IconButton
              aria-label={label}
              sx={{
                padding: { xs: 1, sm: 0.5 },
                borderRadius: theme.shape.borderRadius,
                transition: theme.transitions.create(
                  ["background-color", "transform"],
                  {
                    duration: theme.transitions.duration.shorter,
                    easing: theme.transitions.easing.easeInOut,
                  }
                ),
                "&:hover": {
                  backgroundColor: alpha(theme.palette.common.white, 0.15),
                  transform: "scale(1.05)",
                },
                "&:active": {
                  transform: "scale(0.95)",
                },
                // Добавляем дополнительные стили для кастомных иконок
                "& img": {
                  transition: theme.transitions.create(
                    ["filter", "transform"],
                    {
                      duration: theme.transitions.duration.shorter,
                    }
                  ),
                },
                "&:hover img": {
                  filter: `brightness(0) invert(1) 
                         drop-shadow(0px 0px 4px rgba(247, 110, 160, 0.6))`,
                  transform: "scale(1.1)",
                },
              }}
            >
              {icon}
            </IconButton>

            {!isMobile && (
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.primary,
                  fontWeight: 500,
                  fontSize: "0.75rem",
                  textAlign: "center",
                  lineHeight: 1.2,
                  transition: theme.transitions.create(["color"], {
                    duration: theme.transitions.duration.shorter,
                  }),
                }}
              >
                {label}
              </Typography>
            )}
          </Box>
        </Link>
      ))}
    </Stack>
  );
};
