import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Both faces are served from this origin, so the page makes no third-party
 * request and nothing reflows once the fonts arrive.
 */
const sans = localFont({
  src: "./fonts/ibm-plex-sans-latin-wght-normal.woff2",
  weight: "100 700",
  style: "normal",
  display: "swap",
  variable: "--font-sans-loaded",
  preload: true,
});

/** IBM Plex Serif, capitals only, pinned to weight 600: 3 KB for the wordmark alone. */
const wordmark = localFont({
  src: "./fonts/hisaab-wordmark.woff2",
  weight: "600",
  style: "normal",
  display: "swap",
  variable: "--font-wordmark-loaded",
  preload: true,
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  title: "HISAAB — digital ledger",
  description: "Know who owes what, keep every entry clear, and remind customers through WhatsApp in one tap.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b4f43" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${sans.variable} ${wordmark.variable}`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
