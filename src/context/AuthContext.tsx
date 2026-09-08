import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TargetRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AuthResult {
  success: boolean;
  error?: string;
  confirmationRequired?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseEnabled: boolean;
  login: (email: string, password?: string) => Promise<AuthResult>;
  signup: (
    name: string,
    email: string,
    password: string,
    targetRole: TargetRole
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateUserRole: (role: TargetRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'pm_coach_auth_user';

function mapSupabaseUserToUser(supabaseUser: any, fallbackRole?: TargetRole): User {
  const meta = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    name:
      meta.name ||
      meta.full_name ||
      supabaseUser.email?.split('@')[0].replace('.', ' ').replace(/^\w/, (c: string) => c.toUpperCase()) ||
      'Product Leader',
    email: supabaseUser.email || '',
    targetRole: (meta.targetRole as TargetRole) || fallbackRole || 'Senior Product Manager',
    avatarUrl:
      meta.avatarUrl ||
      meta.avatar_url ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    joinedDate: supabaseUser.created_at
      ? new Date(supabaseUser.created_at).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isSupabaseEnabled = isSupabaseConfigured();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clear any legacy dummy user accounts like Alex Chen
        if (
          parsed?.email === 'alex.chen@example.com' ||
          parsed?.email === 'alex.chen@productleader.io' ||
          parsed?.name === 'Alex Chen'
        ) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          return null;
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }
    // Default to null: visitors are unauthenticated until they log in or sign up
    return null;
  });

  // Listen to Supabase auth events if configured
  useEffect(() => {
    if (!isSupabaseEnabled) {
      setIsLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session?.user) {
        setUser(mapSupabaseUserToUser(session.user));
      } else {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUserToUser(session.user));
      } else {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isSupabaseEnabled]);

  // Sync to local storage
  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  // Log in with Supabase or fallback
  const login = async (email: string, password?: string): Promise<AuthResult> => {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password || '',
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          setUser(mapSupabaseUserToUser(data.user));
          return { success: true };
        }
        return { success: false, error: 'User could not be loaded.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Login failed.' };
      }
    }

    // Local fallback for offline/development use
    await new Promise((resolve) => setTimeout(resolve, 300));
    const loggedUser: User = {
      id: `user-${Date.now()}`,
      name:
        email.split('@')[0].replace('.', ' ').replace(/^\w/, (c) => c.toUpperCase()) ||
        'Product Manager',
      email: email,
      targetRole: 'Senior Product Manager',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
    setUser(loggedUser);
    return { success: true };
  };

  // Sign up with Supabase or fallback
  const signup = async (
    name: string,
    email: string,
    password: string,
    targetRole: TargetRole
  ): Promise<AuthResult> => {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              name: name.trim(),
              targetRole: targetRole,
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        // If email confirmation is required by Supabase project settings
        if (data.user && !data.session) {
          return {
            success: true,
            confirmationRequired: true,
          };
        }

        if (data.user) {
          setUser(mapSupabaseUserToUser(data.user, targetRole));
          return { success: true };
        }

        return { success: false, error: 'Registration could not be completed.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Signup failed.' };
      }
    }

    // Local fallback for offline/development use
    await new Promise((resolve) => setTimeout(resolve, 300));
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: name || 'Product Manager',
      email: email,
      targetRole: targetRole,
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
    setUser(newUser);
    return { success: true };
  };

  // Log out
  const logout = async (): Promise<void> => {
    if (isSupabaseEnabled) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Supabase signOut error:', err);
      }
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const updateUserRole = (role: TargetRole) => {
    if (user) {
      const updated = { ...user, targetRole: role };
      setUser(updated);
      if (isSupabaseEnabled) {
        supabase.auth
          .updateUser({
            data: { targetRole: role },
          })
          .catch((err) => console.warn('Could not sync user role to Supabase:', err));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isSupabaseEnabled,
        login,
        signup,
        logout,
        updateUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
