import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { SITE } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  alternates: {
    canonical: SITE.url,
  },
  title: {
    default: SITE.title,
    template: "%s | Airloom",
  },
  description: SITE.description,
  applicationName: "Airloom",
  keywords: [
    "air quality",
    "air pollution",
    "AQI",
    "PM2.5",
    "exposure planning",
    "Delhi air quality",
    "indoor air",
  ],
  authors: [{ name: "Swapneel Sethi" }],
  creator: "Swapneel Sethi",
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: "Airloom",
    title: SITE.title,
    description: SITE.description,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
  category: "health",
};

export const viewport: Viewport = {
  themeColor: "#070707",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="canonical" href={SITE.url} />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-ink">{children}</body>
    </html>
  );
}
