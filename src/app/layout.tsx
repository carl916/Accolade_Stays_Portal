import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/lib/auth/session";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Accolade Stays Operations Portal",
  description: "Cleaning operations portal for Accolade Stays",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico"
  }
};

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const profile = await getCurrentProfile();

  return (
    <html lang="en">
      <body className={inter.className}>
        <AppShell profile={profile}>{children}</AppShell>
      </body>
    </html>
  );
}
