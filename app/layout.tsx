import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
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
        <AuthProvider>
          <ProtectedRoute>
            <AdminLayout>
              {children}
            </AdminLayout>
          </ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  );
}