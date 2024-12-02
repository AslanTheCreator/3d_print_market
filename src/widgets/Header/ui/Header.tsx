import Image from "next/image";
import { Box, Stack, Typography, Container } from "@mui/material";
import { SearchCategories } from "@/features/search-categories";
import { SearchString } from "@/features/search-catalog";
import { HeaderIconLinks } from "./HeaderIconLinks";
import Link from "next/link";

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
            <Link href={"/"}>
              <Stack direction={"row"} alignItems={"center"} gap={1}>
                <Image src="/logo.png" alt="Logo" width={35} height={35} />
                <Typography
                  component={"h1"}
                  fontWeight={900}
                  textTransform={"uppercase"}
                >
                  3DM
                </Typography>
              </Stack>
            </Link>
            <HeaderIconLinks />
          </Stack>
          {/* Нижняя часть */}
          <Stack direction={"row"} alignItems={"center"} gap={"10px"}>
            <SearchCategories />
            <SearchString />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};
