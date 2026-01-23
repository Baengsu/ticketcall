import localFont from "next/font/local";

export const kboDiaGothic = localFont({
  src: [
    {
      path: "../public/fonts/KBO-Dia-Gothic_light.woff",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/KBO-Dia-Gothic_medium.woff",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/KBO-Dia-Gothic_bold.woff",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-kbo-dia",
  display: "swap",
});
