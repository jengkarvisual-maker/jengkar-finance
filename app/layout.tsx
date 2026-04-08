import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

import "@/app/globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "RUMAH JENGKAR FINANCE",
  description:
    "Internal finance operating system untuk Rumah Jengkar dan seluruh sister brand.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${manrope.variable} ${mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
