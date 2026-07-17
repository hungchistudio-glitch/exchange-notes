import type { Metadata } from "next";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
