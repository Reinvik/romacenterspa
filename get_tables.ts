import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://iuzpgljjfeobxlptmsma.supabase.co';
const STAGING_KEY = 'sb_publishable_SPDWhx5zkQ9y3SiG6FXUhA_1A6ylpl7';

const staging = createClient(STAGING_URL, STAGING_KEY);

async function listTables() {
  const { data, error } = await staging.rpc('get_tables'); // Pruebo si hay RPC
  if (error) {
    // Fallback: intentar una query a info schema si la anon key tiene permisos (pocos probable)
    // O simplemente probar nombres comunes
    console.log('Error listing via RPC, trying common names...');
    const tables = ['customers', 'profiles', 'garage_customers', 'vehicles'];
    for (const t of tables) {
      const { error: e } = await staging.from(t).select('id').limit(1);
      if (!e) console.log(`[FOUND] Table: ${t}`);
      else console.log(`[NOT FOUND] Table: ${t} (${e.message})`);
    }
  } else {
    console.log('Tables:', data);
  }
}

listTables();
