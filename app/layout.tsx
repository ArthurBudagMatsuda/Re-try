import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RE:TRY — One more chance",
  description: "One experiment. Infinite attempts. Follow the current RE:TRY attempt and take part in the community vote.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

