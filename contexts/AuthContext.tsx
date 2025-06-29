'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/auth';
import type { Profile } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  // Function to create profile if missing
  const ensureProfile = async (user: User): Promise<Profile | null> => {
    try {
      // First try to get existing profile
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log("Here is the user data from profiles:",profile)

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Profile not found, creating new profile for:', user.email);
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || '',
            role: 'admin',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          
          // Try using the SQL function as fallback
          try {
            await supabase.rpc('create_missing_profile', {
              user_id: user.id,
              user_email: user.email!,
              user_name: user.user_metadata?.full_name || ''
            });
            
            // Try to fetch again
            const { data: retryProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            
            return retryProfile;
          } catch (rpcError) {
            console.error('RPC fallback failed:', rpcError);
            return null;
          }
        }

        return newProfile;
      } else if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Error in ensureProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) setLoading(false);
          return;
        }

        console.log('Initial session:', session?.user?.email);
        
        if (mounted) {
          setUser(session?.user ?? null);
        }
        
        if (session?.user && mounted) {
          console.log("Here is the id",session.user.id)
          console.log("Here is the uid",session.user.uid)
          const userProfile = await ensureProfile(session.user);
          console.log('Initial profile:', userProfile?.role);
          if (mounted) {
            setProfile(userProfile);
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // For new signups, wait a bit longer
          if (event === 'SIGNED_UP') {
            console.log('New signup detected, waiting for profile creation...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          const userProfile = await ensureProfile(session.user);
          console.log('Profile after auth change:', userProfile?.role);
          if (mounted) {
            setProfile(userProfile);
          }
        } else {
          if (mounted) {
            setProfile(null);
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await auth.signIn(email, password);
      console.log('Sign in successful');
    } catch (error) {
      setLoading(false);
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      await auth.signUp(email, password, fullName);
      console.log('Sign up successful');
      // Note: The auth state change listener will handle setting the user and profile
    } catch (error) {
      setLoading(false);
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await auth.signOut();
      console.log('Sign out successful');
    } catch (error) {
      setLoading(false);
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}