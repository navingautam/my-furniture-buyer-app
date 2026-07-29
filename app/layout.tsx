import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/session";
import { getRemainingBalance } from "@/lib/balance";
import HeaderAuth from "@/components/HeaderAuth";
import { CartProvider } from "@/lib/cart-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Furniture Buyer",
  description: "Browse furniture and place orders within your budget.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const remainingBalance = session.userId
    ? getRemainingBalance(session.userId)
    : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>
          <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold">
              Furniture Buyer
            </Link>
            <HeaderAuth
              email={session.email ?? null}
              remainingBalance={remainingBalance}
            />
          </header>
          <main className="flex-1">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
