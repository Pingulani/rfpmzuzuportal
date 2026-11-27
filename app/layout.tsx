import type { Metadata } from "next";
import type { ReactNode } from "react";
import './globals.css';

export const metadata: Metadata = {
  title: "RFPM Mzuzu Branch Portal",
  description: "Church membership and attendance management portal",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
