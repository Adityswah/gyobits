import type { Metadata } from "next";
import { Inter, Noto_Serif } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Noto_Serif({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "GYOBITS",
  description: "POS & Inventory System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${serif.variable} font-sans bg-bg text-ink min-h-screen flex overflow-hidden`}>
        <Sidebar />
        <main className="flex-1 h-screen overflow-y-auto p-4 md:p-6 bg-bg hidden-scrollbar">
          {children}
        </main>
      </body>
    </html>
  );
}
