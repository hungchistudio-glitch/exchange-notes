import type { Metadata } from "next";

import Providers from "@/app/providers";
import AppPreferencesBootstrap from "@/components/preferences/AppPreferencesBootstrap";
import InterfaceLanguageInitializer from "@/components/preferences/InterfaceLanguageInitializer";

import "./globals.css";

export const metadata: Metadata = {
  title: "Exchange Notes",
  description:
    "Learn vocabulary through real life and private language exchange.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <InterfaceLanguageInitializer />
        <AppPreferencesBootstrap />

        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
