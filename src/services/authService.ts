import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile } from '../types/models';
import { INITIAL_PROFILES, INITIAL_ADMIN_ROLES, ADMIN_EMAIL } from './mockData';

const DEMO_USER_KEY = 'splitmate_demo_current_user';
const PROFILES_STORAGE_KEY = 'splitmate_profiles';
const ADMIN_ROLES_STORAGE_KEY = 'splitmate_admin_roles';

const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

function getStoredProfiles(): UserProfile[] {
  if (isProduction || isSupabaseConfigured) return [];
  const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(INITIAL_PROFILES));
    return INITIAL_PROFILES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_PROFILES;
  }
}

function getStoredAdminRoles() {
  if (isProduction || isSupabaseConfigured) return [];
  const raw = localStorage.getItem(ADMIN_ROLES_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(ADMIN_ROLES_STORAGE_KEY, JSON.stringify(INITIAL_ADMIN_ROLES));
    return INITIAL_ADMIN_ROLES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_ADMIN_ROLES;
  }
}

export const authService = {
  /**
   * Check if user has an active session.
   * Never falls back to mock auto-login in production or when Supabase is configured.
   */
  async getSession() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Supabase session fetch error:', error);
        throw error;
      }
      return data.session;
    }

    // Strictly blocked in production
    if (isProduction) {
      return null;
    }

    // Development local sandbox: only return session if user previously chose a persona
    const demoUserJson = localStorage.getItem(DEMO_USER_KEY);
    if (demoUserJson) {
      try {
        const user = JSON.parse(demoUserJson);
        return { user };
      } catch {
        localStorage.removeItem(DEMO_USER_KEY);
        return null;
      }
    }

    // Default to unauthenticated (never auto-login as admin)
    return null;
  },

  /**
   * Fetch current user's profile from database
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        console.error('Failed to load profile from Supabase:', error.message);
        throw error;
      }
      return data as UserProfile;
    }

    if (isProduction) return null;

    const profiles = getStoredProfiles();
    return profiles.find(p => p.id === userId) || null;
  },

  /**
   * Sign In with Email & Password
   */
  async signIn(email: string, password?: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || '',
      });
      if (error) throw error;
      return data;
    }

    if (isProduction) {
      throw new Error('Supabase is not configured. Production environment cannot use mock authentication.');
    }

    // Sandbox development mode only
    const profiles = getStoredProfiles();
    let profile = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());

    if (!profile) {
      profile = {
        id: `user-${Date.now()}`,
        email,
        full_name: email.split('@')[0],
        avatar_url: null,
        phone: null,
        default_currency: 'INR',
        created_at: new Date().toISOString(),
      };
      profiles.push(profile);
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));

      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        const roles = getStoredAdminRoles();
        if (!roles.some((r: any) => r.user_id === profile!.id)) {
          roles.push({
            id: `admin-${Date.now()}`,
            user_id: profile.id,
            role: 'super_admin',
            created_at: new Date().toISOString(),
          });
          localStorage.setItem(ADMIN_ROLES_STORAGE_KEY, JSON.stringify(roles));
        }
      }
    }

    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(profile));
    return { user: profile, session: { user: profile } };
  },

  /**
   * Sign Up with Email, Password & Full Name
   */
  async signUp(email: string, password: string, fullName: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
      return data;
    }

    if (isProduction) {
      throw new Error('Supabase is not configured. Production environment cannot use mock registration.');
    }

    const profiles = getStoredProfiles();
    const existing = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const newProfile: UserProfile = {
      id: `user-${Date.now()}`,
      email,
      full_name: fullName,
      avatar_url: null,
      phone: null,
      default_currency: 'INR',
      created_at: new Date().toISOString(),
    };

    profiles.push(newProfile);
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));

    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      const roles = getStoredAdminRoles();
      roles.push({
        id: `admin-${Date.now()}`,
        user_id: newProfile.id,
        role: 'super_admin',
        created_at: new Date().toISOString(),
      });
      localStorage.setItem(ADMIN_ROLES_STORAGE_KEY, JSON.stringify(roles));
    }

    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(newProfile));
    return { user: newProfile, session: { user: newProfile } };
  },

  /**
   * Sign Out
   */
  async signOut() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(DEMO_USER_KEY);
  },

  /**
   * Database-backed server-side Admin verification
   * Crucial: Does not rely on client-side hardcoded strings. Queries database admin_roles!
   */
  async checkAdminStatus(userId: string): Promise<boolean> {
    if (!userId) return false;

    if (isSupabaseConfigured) {
      try {
        // First try the security definer RPC function is_admin()
        const { data: rpcData, error: rpcError } = await supabase.rpc('is_admin', {
          check_user_id: userId,
        });

        if (!rpcError && typeof rpcData === 'boolean') {
          return rpcData;
        }

        // Direct select on admin_roles table (enforced by RLS)
        const { data, error } = await supabase
          .from('admin_roles')
          .select('id, role')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Database admin role check failed:', error.message);
          return false;
        }
        return Boolean(data && (data.role === 'admin' || data.role === 'super_admin'));
      } catch (err) {
        console.error('Error verifying admin authorization:', err);
        return false;
      }
    }

    if (isProduction) return false;

    const adminRoles = getStoredAdminRoles();
    return adminRoles.some((r: any) => r.user_id === userId);
  },

  /**
   * Switch user in local Demo mode (disabled in production and when Supabase is connected)
   */
  switchDemoUser(userId: string) {
    if (isProduction || isSupabaseConfigured) {
      throw new Error('Demo persona switching is strictly disabled in production / live Supabase mode.');
    }
    const profiles = getStoredProfiles();
    const user = profiles.find(p => p.id === userId);
    if (user) {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
    }
  },

  getAllProfiles(): UserProfile[] {
    if (isProduction || isSupabaseConfigured) return [];
    return getStoredProfiles();
  }
};
