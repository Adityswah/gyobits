import type { Metadata } from "next";
import { Inter, Noto_Serif } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { AppProvider } from "@/context/AppContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Noto_Serif({ subsets: ["latin"], variable: "--font-serif" });

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
      <body className={`${inter.variable} ${serif.variable} font-sans bg-bg text-ink min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row overflow-x-hidden transition-colors duration-200`}>
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
