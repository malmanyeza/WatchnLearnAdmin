'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from './AuthForm';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin } = useAuth();

  console.log('ProtectedRoute state:', { 
    user: user?.email, 
    profile: profile?.role, 
    loading, 
    isAdmin 
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, showing auth form');
    return <AuthForm />;
  }

  if (!profile) {
    console.log('User found but no profile, showing loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    console.log('User is not admin:', profile.role);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access the admin dashboard.</p>
          <p className="text-sm text-gray-500 mb-4">Current role: {profile.role}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  console.log('User authenticated and authorized, showing dashboard');
  return <>{children}</>;
}