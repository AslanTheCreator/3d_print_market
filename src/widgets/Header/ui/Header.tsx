import Logo from "@/entities/Logo";
import { Cart } from "@/features/Cart";
import { SearchString } from "@/features/CatalogSearch";
import Favorites from "@/features/Favorites";
import Registration from "@/features/Registration";
import { SwitchLanguage } from "@/features/SwitchLanguage";
import NavLink from "@/shared/ui/NavLink";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Container from "@mui/material/Container";

const actions = [
  {
    icon: <AccountBoxIcon />,
    text: "Войти",
    url: "registration",
  },
  {
    icon: <FavoriteBorderIcon />,
    text: "Избранное",
    url: "favorites",
  },
  {
    icon: <ShoppingCartIcon />,
    text: "Корзина",
    url: "cart",
  },
];

function Header() {
  return (
    <Box>
      <Box bgcolor={"#131921"}>
        <Container maxWidth={"lg"}>
          <Stack
            direction={"row"}
            height={"60px"}
            alignItems={"center"}
            justifyContent={"space-between"}
          >
            <Logo />
            <Box flex={"1 1 auto"} mr={"24px"}>
              <SearchString />
            </Box>
            <Stack direction={"row"} gap={"16px"} maxHeight={"40px"}>
              {actions.map((action) => (
                <NavLink
                  key={action.text}
                  text={action.text}
                  childComponent={action.icon}
                  url={action.url}
                />
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>
      <Box bgcolor={"#232f3e"}>
        <Container>
          <Stack direction={"row"} maxHeight={"39px"} pl={"11px"} gap={"10px"}>
            <Button variant={"contained"} color={"primary"}>
              Категории
            </Button>
            <Button variant={"contained"}>Продавцы</Button>
            <Button variant={"contained"}>Продать</Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

export default Header;
