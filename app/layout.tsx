import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhysicsLab — YKS Fizik",
  description:
    "YKS fizik konularını interaktif simülasyonlar ve sorularla öğrenin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="bg-white text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
