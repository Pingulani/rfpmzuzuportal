import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthGuard from '../components/AuthGuard'; // Adjust import path if needed

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RFP Mzuzu Portal',
  description: 'Church Registration and Management Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* The AuthGuard wraps everything, locking the entire app */}
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}