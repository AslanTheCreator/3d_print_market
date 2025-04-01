import { useAuth } from "@/features/auth/hooks/useAuth";
import { PersonOutline, ShoppingCartOutlined } from "@mui/icons-material";
import { Stack, IconButton, useTheme, useMediaQuery } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const HeaderIconLinks = () => {
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

  const headerIcons = [
    {
      url: "/auth/login",
      icon: <PersonOutline />,
      label: "Профиль",
      onClick: handleProfileClick,
    },
    {
      url: "/cart",
      icon: <ShoppingCartOutlined />,
      label: "Корзина",
      onClick: undefined,
    },
  ];

  return (
    <Stack direction="row" spacing={isMobile ? 0.5 : 1} alignItems="center">
      {headerIcons.map(({ url, icon, label, onClick }, index) => (
        <Link
          href={url}
          key={index}
          passHref
          style={{ textDecoration: "none" }}
          onClick={onClick}
        >
          <IconButton
            aria-label={label}
            sx={{
              color: "white",
              padding: isMobile ? 1 : 1.5,
              "& .MuiSvgIcon-root": {
                fontSize: isMobile ? 28 : 32,
              },
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.15)",
              },
            }}
          >
            {icon}
          </IconButton>
        </Link>
      ))}
    </Stack>
  );
};
