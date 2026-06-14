import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spiral Nexus",
  description:
    "The AI-powered marketplace to discover, list, and commercialise intellectual property assets.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
