import SearchString from "@/features/CatalogSearch";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import IconButtonLink from "@/widgets/IconButtonLink";
import CategoriesMenu from "@/features/CategoriesMenu";
import Image from "next/image";

export const Header = () => {
  return (
    <Box component={"header"} borderBottom={1} borderColor={"lightgray"}>
      <Container>
        <Stack p={"16px 0"} gap={"5px"}>
          {/* Верхняя часть */}
          <Stack
            direction={"row"}
            alignItems={"center"}
            justifyContent={"space-between"}
          >
            <Stack direction={"row"} alignItems={"center"} gap={1}>
              <Image src="/logo.png" alt="Logo" width={35} height={35} />
              <Typography
                component={"h1"}
                fontWeight={900}
                textTransform={"uppercase"}
              >
                3dm
              </Typography>
            </Stack>

            <Stack direction={"row"} alignItems={"center"}>
              {/* <Link href={"/login"}>
                <Typography color={"white"}>Sign in &#x3E;</Typography>
              </Link> */}
              <IconButtonLink />
            </Stack>
          </Stack>
          {/* Нижняя часть */}
          <Stack direction={"row"} alignItems={"center"} gap={"10px"}>
            <CategoriesMenu />
            <SearchString />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};
