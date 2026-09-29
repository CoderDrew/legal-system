import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MatterMind — Active Matter Status",
  description: "Evidence-grounded active-matter status reconstruction.",
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
