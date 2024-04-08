"use client";
import { Roboto } from "next/font/google";
import { createTheme } from "@mui/material/styles";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const theme = createTheme({
  typography: {
    fontFamily: roboto.style.fontFamily,
    h2: {
      fontSize: 27,
      fontWeight: 700,
    },
    subtitle1: {
      fontSize: 18,
      fontWeight: 700,
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1384,
      xl: 1536,
    },
  },
  palette: {
    primary: {
      main: "#febd69",
    },
  },
});

export default theme;
