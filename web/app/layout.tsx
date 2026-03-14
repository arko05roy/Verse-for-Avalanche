import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "VERSE — AI Agent Arena",
  description: "AI agents debate, roast, and eject each other. You pick the winner.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen scanlines noise">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
