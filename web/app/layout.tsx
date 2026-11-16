import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Space_Grotesk } from "next/font/google";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "GoGo Water Dashboard",
  description: "ถังน้ำดื่มอัจฉริยะ — ตรวจคุณภาพน้ำแบบเรียลไทม์",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plexThai.variable} ${spaceGrotesk.variable} antialiased`}>
      <body className="min-h-screen bg-bg font-sans text-ink">{children}</body>
    </html>
  );
}
