import type { Metadata } from "next";

import { QueryProvider } from "@/components/QueryProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { MobileNav } from "@/components/MobileNav";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Saham-US — Professional US Stock Market Analysis",
    template: "%s | Saham-US",
  },
  description:
    "Professional-grade US stock analysis platform for Indonesian investors. Real-time market data, technical analysis, ML predictions, and AI-powered insights for US stock market trading.",
  keywords: [
    "saham US", "stock market", "analisa saham", "trading", "investasi",
    "technical analysis", "screener", "swing trading", "scalping",
    "machine learning", "prediksi saham", "market data",
  ],
  authors: [{ name: "Saham-US Team" }],
  creator: "Saham-US",
  metadataBase: new URL("https://saham-us.com"),
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://saham-us.com",
    siteName: "Saham-US",
    title: "Saham-US — Professional US Stock Market Analysis",
    description:
      "Platform analisa saham US profesional untuk investor Indonesia. Data real-time, technical analysis, ML predictions, dan AI-powered insights.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Saham-US Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Saham-US — Professional US Stock Market Analysis",
    description:
      "Platform analisa saham US profesional untuk investor Indonesia.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <QueryProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <TopBar />
              <main className="scrollbar-thin relative flex-1 overflow-y-auto pb-16 lg:pb-0">
                {/* Subtle background pattern */}
                <div className="pointer-events-none absolute inset-0 dot-pattern opacity-30" />
                <div className="relative px-4 py-6 sm:px-6 lg:px-8">
                  {children}
                </div>
              </main>
            </div>
          </div>
          <MobileNav />
        </QueryProvider>
      </body>
    </html>
  );
}
