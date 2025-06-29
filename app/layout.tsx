import './globals.css';
import type { Metadata } from 'next';
import { AdminLayout } from '@/components/layout/AdminLayout';

export const metadata: Metadata = {
  title: 'WatchnLearn Admin Dashboard',
  description: 'Admin dashboard for WatchnLearn EdTech platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AdminLayout>
          {children}
        </AdminLayout>
      </body>
    </html>
  );
}