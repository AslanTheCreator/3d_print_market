import Logo from "@/entities/Logo";
import { SearchString } from "@/features/CatalogSearch";
import NavLink from "@/shared/ui/NavLink";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Container from "@mui/material/Container";
import NavigationButtons from "@/widgets/NavigationButtons";
import Button from "@mui/material/Button";

// const actions = [
//   {
//     icon: <AccountBoxIcon color={"primary"} />,
//     text: "Войти",
//     url: "registration",
//   },
//   {
//     icon: <FavoriteBorderIcon />,
//     text: "Избранное",
//     url: "favorites",
//   },
//   {
//     icon: <ShoppingCartIcon />,
//     text: "Корзина",
//     url: "cart",
//   },
// ];

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
            <NavigationButtons />
            <Box flex={"1 1 auto"} mr={"24px"}>
              <SearchString />
            </Box>
            {/* <Stack direction={"row"} gap={"16px"} maxHeight={"40px"}>
              {actions.map((action) => (
                <NavLink
                  key={action.text}
                  text={action.text}
                  childComponent={action.icon}
                  url={action.url}
                />
              ))}
            </Stack> */}
            <Button variant={"contained"} size={"large"}>
              Войти
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

export default Header;
