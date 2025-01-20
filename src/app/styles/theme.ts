"use client";
import { Montserrat } from "next/font/google";
import { createTheme } from "@mui/material/styles";

const montserrat = Montserrat({
  subsets: ["cyrillic"],
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const theme = createTheme({
  typography: {
    fontFamily: montserrat.style.fontFamily,
    h2: {
      fontSize: 23,
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
      main: "#ef4284",
    },
    secondary: {
      main: "#fff",
    },
  },
});

export default theme;
