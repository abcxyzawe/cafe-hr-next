import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { PWARegister } from "@/components/pwa-register";
import { NavProgressBar } from "@/components/nav-progress-bar";
import { paletteCSS } from "@/lib/palette";
import { getCurrentPalette } from "@/lib/palette-server";
import { getCurrentDensity } from "@/lib/density";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cafe HR — Quản lý nhân sự quán cà phê",
  description:
    "Hệ thống quản lý nhân sự, lịch ca, chấm công và tính lương dành cho quán cà phê.",
  manifest: "/manifest.webmanifest",
  applicationName: "Cafe HR",
  appleWebApp: {
    capable: true,
    title: "Cafe HR",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/brand/logo-192.png",
    apple: "/brand/logo-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6b4423" },
    { media: "(prefers-color-scheme: dark)", color: "#1a120c" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const palette = await getCurrentPalette();
  const density = await getCurrentDensity();
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-palette={palette.id}
      data-density={density}
      suppressHydrationWarning
    >
      <head>
        <style id="palette-vars">{paletteCSS(palette)}</style>
      </head>
      <body className="min-h-screen flex">
        <ThemeProvider>
          <NavProgressBar />
          {children}
          <Toaster richColors position="top-right" />
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
