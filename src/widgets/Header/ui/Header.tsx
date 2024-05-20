import Logo from "@/entities/Logo";
import { SearchString } from "@/features/CatalogSearch";
import NavLink from "@/shared/ui/NavLink";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Container from "@mui/material/Container";
import NavigationButtons from "@/widgets/NavigationButtons";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Unstable_Grid2";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import IconButtonLink from "@/widgets/IconButtonLink/ui/IconButtonLink";

function Header() {
  return (
    <Box>
      <Box bgcolor={"#131921"}>
        <Container maxWidth={"sm"}>
          <Stack>
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
                <Link href={"#"}>
                  <Typography color={"white"}>Sign in &#x3E;</Typography>
                </Link>
                <IconButtonLink />
              </Stack>
            </Stack>
            <Stack height={"50px"}>
              <SearchString />
            </Stack>
          </Stack>
        </Container>
        */
      </Box>
    </Box>
  );
}

export default Header;
