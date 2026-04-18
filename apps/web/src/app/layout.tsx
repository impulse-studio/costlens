import type { Metadata } from "next";

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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
