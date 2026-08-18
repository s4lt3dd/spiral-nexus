import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Montserrat, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

// Geometric display (Gotham-like, matches the logo wordmark) + grotesque body.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spiral Nexus",
  description:
    "The centralised hub to discover and commercialise intangible assets and find the right business partners.",
  openGraph: {
    title: "Spiral Nexus",
    description:
      "The centralised hub to discover and commercialise intangible assets and find the right business partners.",
    images: ["/brand/spiral-nexus-og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0b14",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("font-sans", inter.variable, montserrat.variable)}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
