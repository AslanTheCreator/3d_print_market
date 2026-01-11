import { useAuth } from "@/features/auth";
import { useCartChecks } from "@/entities/cart";
import { useFavoritesChecks } from "@/entities/favorites/hooks";
import {
  Stack,
  IconButton,
  useTheme,
  useMediaQuery,
  Typography,
  Box,
  Badge,
  alpha,
} from "@mui/material";
import { FavoriteBorderOutlined } from "@mui/icons-material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PersonCustomIcon from "@/shared/assets/icons/userAccount.svg";
import ShoppingCartCustomIcon from "@/shared/assets/icons/backet.svg";

interface HeaderIconConfig {
  url: string;
  icon: React.ReactNode;
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  badge?: number;
}

const ICON_SIZES = {
  mobile: 28,
  desktop: 24,
} as const;

export const HeaderActions = () => {
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { getCartItemsCount } = useCartChecks();
  const { getFavoritesItemsCount } = useFavoritesChecks();

  const iconSize = isMobile ? ICON_SIZES.mobile : ICON_SIZES.desktop;

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(isAuthenticated ? "/dashboard" : "/auth/login");
  };

  const headerIcons: HeaderIconConfig[] = [
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
      badge: getFavoritesItemsCount,
    },
    {
      url: "/auth/login",
      icon: (
        <Image
          src={PersonCustomIcon}
          alt="Профиль"
          width={iconSize}
          height={iconSize}
          style={{ objectFit: "contain" }}
        />
      ),
      label: "Профиль",
      onClick: handleProfileClick,
    },
    {
      url: "/checkout",
      icon: (
        <Image
          src={ShoppingCartCustomIcon}
          alt="Корзина"
          width={iconSize}
          height={iconSize}
          style={{ objectFit: "contain" }}
        />
      ),
      label: "Корзина",
      badge: getCartItemsCount,
    },
  ];

  return (
    <Stack
      component="nav"
      direction="row"
      spacing={isMobile ? 0.5 : 1}
      alignItems="center"
      sx={{
        minHeight: { xs: 40, sm: 50 },
      }}
      aria-label="Действия в шапке сайта"
    >
      {headerIcons.map((item, index) => (
        <HeaderActionItem
          key={`header-action-${index}`}
          {...item}
          isMobile={isMobile}
        />
      ))}
    </Stack>
  );
};

interface HeaderActionItemProps extends HeaderIconConfig {
  isMobile: boolean;
}

const HeaderActionItem = ({
  url,
  icon,
  label,
  onClick,
  badge,
  isMobile,
}: HeaderActionItemProps) => {
  const theme = useTheme();

  const content = (
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
          "& img": {
            transition: theme.transitions.create(["filter", "transform"], {
              duration: theme.transitions.duration.shorter,
            }),
          },
          "&:hover img": {
            filter: `brightness(0) invert(1) drop-shadow(0px 0px 4px rgba(247, 110, 160, 0.6))`,
            transform: "scale(1.1)",
          },
        }}
      >
        {badge !== undefined && badge > 0 ? (
          <Badge badgeContent={badge} color="primary">
            {icon}
          </Badge>
        ) : (
          icon
        )}
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
  );

  return (
    <Link
      href={url}
      passHref
      style={{ textDecoration: "none" }}
      onClick={onClick}
      aria-label={label}
    >
      {content}
    </Link>
  );
};
