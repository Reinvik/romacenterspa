import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// Client for public schema (profiles, companies)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for garage schema (using public schema)
export const supabaseGarage = createClient(supabaseUrl, supabaseAnonKey);
