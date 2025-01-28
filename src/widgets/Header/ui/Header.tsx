"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Box, Stack, Typography, Container } from "@mui/material";
import { SearchCategories } from "./SearchCategories";
import { SearchString } from "./SearchString";
import { HeaderIconLinks } from "./HeaderIconLinks";
import Link from "next/link";
import { useRouter } from "next/router";
import debounce from "lodash.debounce";

const Header = () => {
  const [isVisible, setIsVisible] = useState(true); // Показывает ли хедер
  const [lastScrollY, setLastScrollY] = useState(0); // Последняя позиция прокрутки

  useEffect(() => {
    const handleScroll = debounce(() => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    }, 50);

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);
  return (
    <Box
      component={"header"}
      borderBottom={1}
      borderColor={"lightgray"}
      position={"fixed"}
      bgcolor={"#54C5E5"}
      zIndex={999}
      sx={{
        top: isVisible ? 0 : "-119px",
        transition: "top 0.5s ease",
      }}
      width={"100%"}
    >
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
                  color={"white"}
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

export default Header;
