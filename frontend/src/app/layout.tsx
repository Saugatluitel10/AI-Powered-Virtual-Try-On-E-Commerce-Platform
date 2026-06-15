import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Providers from "./providers";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VTryon — AI Virtual Try-On Fashion Platform",
  description:
    "Upload your photo and virtually try on thousands of outfits. Nepal's first AI-powered fashion platform with personalized styling recommendations.",
  keywords: ["virtual try-on", "AI fashion", "Nepal", "online shopping", "styling"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={`${inter.className} min-h-full flex flex-col`}>
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
