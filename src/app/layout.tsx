import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Accolade Stays Operations Portal",
  description: "Cleaning operations portal for Accolade Stays"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
