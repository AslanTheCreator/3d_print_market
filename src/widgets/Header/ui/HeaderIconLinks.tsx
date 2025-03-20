import { PersonOutline, ShoppingCartOutlined } from "@mui/icons-material";
import { Stack, IconButton, useTheme, useMediaQuery } from "@mui/material";
import Link from "next/link";

const headerIcons = [
  {
    url: "/auth/login",
    icon: <PersonOutline />,
    label: "Профиль",
  },
  {
    url: "/cart",
    icon: <ShoppingCartOutlined />,
    label: "Корзина",
  },
];

export const HeaderIconLinks = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Stack direction="row" spacing={isMobile ? 0.5 : 1} alignItems="center">
      {headerIcons.map(({ url, icon, label }, index) => (
        <Link
          href={url}
          key={index}
          passHref
          style={{ textDecoration: "none" }}
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
