'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from './AuthForm';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
          <div className="mb-6">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Setting up your profile...</h2>
            <p className="text-gray-600 mb-4">This may take a few moments for new accounts</p>
          </div>
          
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              If this screen persists, there may be a database configuration issue. 
              Please contact your system administrator.
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-gray-500 space-y-2 mb-4">
            <p>User: {user.email}</p>
            <p>User ID: {user.id}</p>
          </div>
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => {
                // Sign out and redirect to login
                window.location.href = '/';
              }}
              className="w-full text-sm"
            >
              Sign Out and Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    console.log('User is not admin:', profile.role);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">You don't have permission to access the admin dashboard.</p>
          </div>
          
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Current role: <strong>{profile.role}</strong>
              <br />
              Required role: <strong>admin</strong> or <strong>super_admin</strong>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                // Sign out and redirect to login
                window.location.href = '/';
              }}
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  console.log('User authenticated and authorized, showing dashboard');
  return <>{children}</>;
}