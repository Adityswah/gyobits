import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { AppProvider } from "@/context/AppContext";

export const metadata: Metadata = {
  title: "GYOBITS - POS & Inventory System",
  description: "POS offline-first & financial inventory dashboard for Soto & Gyoza",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-bg text-ink min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row overflow-x-hidden transition-colors duration-200 antialiased">
        <AppProvider>
          <Sidebar />
          <main className="flex-1 min-h-screen md:min-h-0 md:h-screen p-3.5 sm:p-5 md:p-6 pb-24 md:pb-8 bg-bg overflow-y-auto hidden-scrollbar">
            {children}
          </main>
        </AppProvider>
      </body>
    </html>
  );
}

