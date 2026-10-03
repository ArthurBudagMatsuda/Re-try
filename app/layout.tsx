import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RE:TRY — One more chance",
  description: "Every attempt can fail. Every failure becomes history. Monitor the current attempt and explore the RE:TRY Cemetery.",
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



