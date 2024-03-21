import Logo from "@/entities/Logo";
import { Cart } from "@/features/Cart";
import { SearchString } from "@/features/CatalogSearch";
import Favorites from "@/features/Favorites";
import Registration from "@/features/Registration";
import { SwitchLanguage } from "@/features/SwitchLanguage";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

function Header() {
  return (
    <Box>
      <Stack
        direction={"row"}
        height={"60px"}
        alignItems={"center"}
        justifyContent={"space-between"}
        bgcolor={"#131921"}
      >
        <Logo />
        <Box flex={"1 1 auto"}>
          <SearchString />
        </Box>
        <SwitchLanguage />
        <Registration />
        <Favorites />
        <Cart />
      </Stack>
    </Box>
  );
}

export default Header;
