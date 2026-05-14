import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

import "@/app/globals.css";
import { PwaRegister } from "@/components/pwa-register";
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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RJ Finance",
  },
  icons: {
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
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

export const viewport: Viewport = {
  themeColor: "#f6f1e7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body className={`${manrope.variable} ${mono.variable} antialiased`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
