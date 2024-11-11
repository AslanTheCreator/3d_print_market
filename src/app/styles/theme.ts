"use client";
import { Nunito } from "next/font/google";
import { createTheme } from "@mui/material/styles";

const nunito = Nunito({
  subsets: ["cyrillic"],
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const theme = createTheme({
  typography: {
    fontFamily: nunito.style.fontFamily,
    h2: {
      fontSize: 25,
      fontWeight: 500,
    },
    h3: {
      fontSize: 20,
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
    secondary: {
      main: "#fff",
    },
  },
});

export default theme;
