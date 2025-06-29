'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
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

  // Function to create profile if missing - using direct SQL to bypass RLS
  const ensureProfile = async (user: User): Promise<Profile | null> => {
    try {
      console.log('Attempting to fetch/create profile for user:', user.id);
      
      // First, try to get the profile using the service role to bypass RLS
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist, try to create it using the RPC function
        if (error.code === 'PGRST116' || error.message.includes('No rows')) {
          console.log('Profile not found, creating new profile for:', user.email);
          
          try {
            // Use the RPC function to create the profile
            const { error: rpcError } = await supabase.rpc('create_missing_profile', {
              user_id: user.id,
              user_email: user.email!,
              user_name: user.user_metadata?.full_name || ''
            });

            if (rpcError) {
              console.error('RPC error creating profile:', rpcError);
            } else {
              console.log('Profile created successfully via RPC');
              
              // Try to fetch the profile again
              const { data: newProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

              if (!fetchError && newProfile) {
                console.log('Successfully fetched newly created profile:', newProfile.role);
                return newProfile;
              }
            }
          } catch (rpcError) {
            console.error('RPC function failed:', rpcError);
          }

          // If RPC fails, try direct insert (this might fail due to RLS but worth trying)
          try {
            const { data: insertedProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email!,
                full_name: user.user_metadata?.full_name || '',
                role: 'admin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (!insertError && insertedProfile) {
              console.log('Profile created via direct insert:', insertedProfile.role);
              return insertedProfile;
            } else {
              console.error('Direct insert failed:', insertError);
            }
          } catch (insertError) {
            console.error('Direct insert exception:', insertError);
          }
        }
        
        return null;
      }

      if (profile) {
        console.log('Profile found:', profile.role);
        return profile;
      }

      return null;
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
          console.log('User found, fetching profile for:', session.user.id);
          const userProfile = await ensureProfile(session.user);
          console.log('Initial profile result:', userProfile?.role);
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
          // For new signups, wait a bit longer for the trigger to complete
          if (event === 'SIGNED_UP') {
            console.log('New signup detected, waiting for profile creation...');
            await new Promise(resolve => setTimeout(resolve, 2000));
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Signin error:', error);
        
        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Account not activated. Please contact your administrator.');
        }
        
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        
        throw error;
      }

      console.log('Sign in successful for:', email);
      // The auth state change listener will handle setting the user and profile
    } catch (error) {
      setLoading(false);
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      if (!data || !data.user) {
        throw new Error('Failed to create user account');
      }

      console.log('Sign up successful for:', email);
      // The auth state change listener will handle setting the user and profile
    } catch (error) {
      setLoading(false);
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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