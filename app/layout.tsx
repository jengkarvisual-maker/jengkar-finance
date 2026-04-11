import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

import "@/app/globals.css";
import { getAppUrl } from "@/lib/env";

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
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "RUMAH JENGKAR FINANCE",
    template: "%s | RUMAH JENGKAR FINANCE",
  },
  applicationName: "RUMAH JENGKAR FINANCE",
  description:
    "Internal finance operating system untuk Rumah Jengkar dan seluruh sister brand.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body className={`${manrope.variable} ${mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
