import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthUser extends User {
  profile?: {
    full_name?: string;
    role: string;
    avatar_url?: string;
  };
}

export const auth = {
  // Sign up with email and password
  signUp: async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          // Disable email confirmation for admin system
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      console.log('Signup response:', data);

      // Check if user was created
      if (!data || !data.user) {
        throw new Error('Failed to create user account');
      }

      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Manually create profile if trigger didn't work
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!existingProfile) {
          console.log('Creating profile manually for user:', data.user.id);
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email!,
              full_name: fullName,
              role: 'admin', // Default role for admin system
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
            // Don't throw here, as the user was created successfully
          }
        }
      } catch (profileCheckError) {
        console.error('Error checking/creating profile:', profileCheckError);
      }

      return data;
    } catch (error) {
      console.error('Auth signup error:', error);
      throw error;
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
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

      console.log('Signin response:', data);

      // Update last login if user exists
      if (data.user) {
        try {
          await supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.user.id);
        } catch (updateError) {
          console.error('Error updating last login:', updateError);
          // Don't throw, as signin was successful
        }
      }

      return data;
    } catch (error) {
      console.error('Auth signin error:', error);
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Get user profile with better error handling
  getUserProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist, try to create it
        if (error.code === 'PGRST116') { // No rows returned
          console.log('Profile not found, attempting to create...');
          
          // Get user info from auth
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id === userId) {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: user.email!,
                full_name: user.user_metadata?.full_name || '',
                role: 'admin',
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating profile:', createError);
              return null;
            }

            return newProfile;
          }
        }
        
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  },

  // Update user profile
  updateProfile: async (userId: string, updates: Partial<{
    full_name: string;
    avatar_url: string;
    role: string;
  }>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Check if user is admin
  isAdmin: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) return false;
      return data.role === 'admin' || data.role === 'super_admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  },
};