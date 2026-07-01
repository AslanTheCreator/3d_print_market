import localFont from "next/font/local";

export const montserrat = localFont({
  src: [
    {
      path: "../../../public/fonts/montserrat/Montserrat-Variable.woff2",
      weight: "400 800",
      style: "normal",
    },
  ],
  variable: "--font-montserrat",
  display: "swap",
});
