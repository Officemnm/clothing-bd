import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clothing BD LTD.",
  description: "Premium business management portal for Clothing BD LTD.",
  icons: {
    icon: [
      { url: "/favicon.svg",        type: "image/svg+xml" },
      { url: "/favicon-32x32.png",  sizes: "32x32",   type: "image/png" },
      { url: "/favicon-16x16.png",  sizes: "16x16",   type: "image/png" },
      { url: "/icon-192.png",       sizes: "192x192",  type: "image/png" },
      { url: "/favicon.png",        sizes: "512x512",  type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple:    { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
