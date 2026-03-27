import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// Client principal — schema público (auth: profiles, companies)
const client = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: { eventsPerSecond: 0 }
    }
});

// Client dedicado para Roma Center SPA — apunta a schema client_romaspa
// Usa el mismo GoTrueClient para evitar múltiples instancias de sesión
const romaspaClient = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'client_romaspa' },
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 0 } }
});

// supabase → auth + profiles + companies (schema public)
export const supabase = client;

// supabaseGarage → datos de negocio de Roma SPA (schema client_romaspa)
export const supabaseGarage = romaspaClient;
