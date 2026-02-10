import { createClient } from '@supabase/supabase-js';
import { User, Dataset } from './types';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ============= AUTHENTICATION FUNCTIONS =============

/**
 * Sign up with email and password using Supabase Auth
 * Passwords are securely hashed by Supabase
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string
) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }, // Store name in user metadata
      },
    });

    if (error) throw error;
    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: err.message };
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err.message };
  }
};

/**
 * Sign in with Google OAuth
 * Redirects to Google, then back to your app
 */
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });

    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
};

/**
 * Get current session
 */
export const getCurrentSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session: data.session, error: null };
  } catch (err: any) {
    return { session: null, error: err.message };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    if (data.user) {
      // Convert Supabase user to our User type
      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
        avatar: data.user.user_metadata?.avatar_url,
      };
      return { user, error: null };
    }

    return { user: null, error: null };
  } catch (err: any) {
    return { user: null, error: err.message };
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user: User = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        avatar: session.user.user_metadata?.avatar_url,
      };
      callback(user);
    } else {
      callback(null);
    }
  });

  return subscription;
};

// ============= DATABASE FUNCTIONS =============

/**
 * Save dataset to Supabase
 */
export const saveDataset = async (dataset: Dataset, userId: string) => {
  try {
    const { data, error } = await supabase.from('datasets').upsert(
      {
        id: dataset.id,
        user_id: userId,
        name: dataset.name,
        upload_date: dataset.upload_date,
        row_count: dataset.row_count,
        column_count: dataset.column_count,
        health_score: dataset.health_score,
        columns: dataset.columns,
        issues: dataset.issues,
        insights: dataset.insights,
        charts: dataset.charts,
        summary: dataset.summary,
        intent: dataset.intent,
      },
      { onConflict: 'id' }
    );

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
};

/**
 * Get all datasets for current user
 */
export const getUserDatasets = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('user_id', userId)
      .order('upload_date', { ascending: false });

    if (error) throw error;

    const datasets: Dataset[] = (data || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      upload_date: item.upload_date,
      row_count: item.row_count,
      column_count: item.column_count,
      health_score: item.health_score,
      columns: item.columns,
      issues: item.issues,
      insights: item.insights,
      charts: item.charts,
      summary: item.summary,
      intent: item.intent,
    }));

    return { datasets, error: null };
  } catch (err: any) {
    return { datasets: [], error: err.message };
  }
};

/**
 * Delete dataset
 */
export const deleteDataset = async (datasetId: string) => {
  try {
    const { error } = await supabase.from('datasets').delete().eq('id', datasetId);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
};
