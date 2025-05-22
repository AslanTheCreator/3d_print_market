import { useAuth } from "@/features/auth/hooks/useAuth";
import { PersonOutline, ShoppingCartOutlined } from "@mui/icons-material";
import { Stack, IconButton, useTheme, useMediaQuery } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Person, ShoppingCart, PersonTwoTone } from "@mui/icons-material";
import PersonOutlineTwoToneIcon from "@mui/icons-material/PersonOutlineTwoTone";
import { PersonCustomIcon } from "@/shared/assets/icons/SvgIcon";

export const HeaderIconLinks = () => {
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (true) {
      router.push("/dashboard");
    } else {
      router.push("/auth/login");
    }
  };

  const headerIcons = [
    {
      url: "/auth/login",
      icon: <Person />,
      label: "Профиль",
      onClick: handleProfileClick,
    },
    {
      url: "/cart",
      icon: <ShoppingCart />,
      label: "Корзина",
      onClick: undefined,
    },
  ];

  return (
    <Stack
      direction="row"
      spacing={isMobile ? 0.5 : 1}
      alignItems="center"
      minHeight={isMobile ? 40 : 50}
    >
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
            color="primary"
            sx={{
              padding: isMobile ? 1 : 1.5,
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.15)",
              },
              "& .MuiSvgIcon-root": {
                fontSize: isMobile ? 30 : 32,
              },
              // "& .MuiSvgIcon-root": {
              //   fontSize: isMobile ? 30 : 32,
              //   WebkitTextStroke: "1px #ffffff", // Белый контур для контраста
              //   filter: `
              //     drop-shadow(0px 0px 2px rgba(211, 44, 108, 0.8))
              //     drop-shadow(0px 0px 1px rgba(0, 0, 0, 0.7))
              //   `, // Комбинация теней для глубины
              //   transition: "all 0.2s ease",
              // },
              // "&:hover .MuiSvgIcon-root": {
              //   color: "#f76ea0", // При наведении используем светлый оттенок primary
              //   transform: "scale(1.1)",
              // },
            }}
          >
            {icon}
          </IconButton>
        </Link>
      ))}
    </Stack>
  );
};
