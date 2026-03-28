import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// Client principal — schema público (auth: profiles, companies)
// Se usa .schema('client_romaspa') para acceder a los datos de negocio
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: { eventsPerSecond: 0 }
    }
});

// supabaseGarage → datos de negocio de Roma SPA (schema client_romaspa)
// Comparten el mismo cliente y sesión de autenticación
export const supabaseGarage = supabase.schema('client_romaspa');
