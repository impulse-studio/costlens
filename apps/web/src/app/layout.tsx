import type { Metadata } from "next";
import Link from "next/link";

import { appConfig } from "./app.config";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-950 antialiased">
        <header className="border-b border-zinc-200 bg-white">
          <nav className="mx-auto flex max-w-5xl gap-6 px-6 py-3 text-sm font-medium text-zinc-700">
            <Link className="hover:text-zinc-950" href="/">
              Dashboard
            </Link>
            <Link className="hover:text-zinc-950" href="/admin">
              Admin
            </Link>
          </nav>
        </header>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
