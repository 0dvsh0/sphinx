import type { Metadata, Viewport } from "next";
import { app } from "@/lib/config";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: app.name,
  description: app.tagline,
  manifest: "/manifest.webmanifest",
  applicationName: app.name,
  // A child's route should never leak to a referrer. See next.config.ts.
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
  // Never disable zoom. Blocking pinch-zoom breaks the accessibility floor.
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        {children}
        {/* Registered once, at the root, so every route can be opened offline. */}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}