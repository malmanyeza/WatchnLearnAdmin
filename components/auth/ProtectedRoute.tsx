'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from './AuthForm';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    console.log('User found but no profile, showing profile setup...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Setting up your profile...</h2>
          <p className="text-gray-600 mb-4">This may take a few moments for new accounts</p>
          <div className="text-sm text-gray-500 space-y-2">
            <p>User: {user.email}</p>
            <p>If this takes too long, try refreshing the page.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
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
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="block mx-auto text-primary hover:underline"
            >
              Refresh Page
            </button>
            <button
              onClick={() => {
                // Sign out and redirect to login
                window.location.href = '/';
              }}
              className="block mx-auto text-gray-500 hover:underline text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('User authenticated and authorized, showing dashboard');
  return <>{children}</>;
}