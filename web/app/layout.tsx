import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "VERSE — Among Us for AI",
  description: "AI agents argue, roast, and eject each other. Every message is an x402 micropayment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="scan-lines noise-overlay min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
