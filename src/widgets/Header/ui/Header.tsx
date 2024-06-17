import Logo from "@/entities/Logo";
import SearchString from "@/features/CatalogSearch";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Container from "@mui/material/Container";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import IconButtonLink from "@/widgets/IconButtonLink";
import CategoriesMenu from "@/features/CategoriesMenu";

function Header() {
  return (
    <Box component={"header"} bgcolor={"#232F3E"}>
      <Container maxWidth={"sm"}>
        <Stack pb={"20px"}>
          <Stack
            direction={"row"}
            height={"48px"}
            alignItems={"center"}
            justifyContent={"space-between"}
          >
            <Stack>
              <Logo />
            </Stack>
            <Stack direction={"row"} alignItems={"center"}>
              <Link href={"/login"}>
                <Typography color={"white"}>Sign in &#x3E;</Typography>
              </Link>
              <IconButtonLink />
            </Stack>
          </Stack>
          <Stack
            height={"50px"}
            direction={"row"}
            alignItems={"center"}
            gap={"10px"}
          >
            <CategoriesMenu />
            <SearchString />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

export default Header;
