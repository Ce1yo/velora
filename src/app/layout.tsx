import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "VELORA — Explore Shared Bikes Around the World",
  description:
    "Explore shared bike systems, stations, availability, trips and mobility patterns around the world.",
  openGraph: {
    title: "VELORA — Explore Shared Bikes Around the World",
    description:
      "Explore shared bike systems, stations, availability, trips and mobility patterns around the world.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans bg-ink-950 text-[#e7e9ee] min-h-screen">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
