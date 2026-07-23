import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import { siteConfig } from "@/constants/site";
import { Toaster } from "@/components/ui/toaster";
import { OfflineBanner } from "@/components/shared/offline-banner";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "booking",
    "hotels",
    "apartments",
    "resorts",
    "shared rooms",
    "convention hall",
    "transport",
    "tours",
    "travel",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#63ab45",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout — owns the document shell only (fonts, base body styles). The
 * public site chrome lives in the `(marketing)` group layout and the dashboard
 * has its own shell, so the two surfaces stay fully decoupled.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${rubik.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-surface text-ink antialiased" suppressHydrationWarning>
        <OfflineBanner />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
