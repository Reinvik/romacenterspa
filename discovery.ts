import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://iuzpgljjfeobxlptmsma.supabase.co';
const STAGING_KEY = 'sb_publishable_SPDWhx5zkQ9y3SiG6FXUhA_1A6ylpl7';

const staging = createClient(STAGING_URL, STAGING_KEY);

async function discover() {
  const candidates = [
    'customers', 'garage_customers', 'clients', 'profiles', 'users', 
    'directory', 'customer_directory', 'client_directory', 'customer_list',
    'customer_data', 'garage_data', 'contacts', 'nexus_customers'
  ];

  for (const table of candidates) {
    const { data, error } = await staging.from(table).select('*').limit(1);
    if (error) {
      console.log(`[NOT FOUND] Table: ${table} - Error: ${error.message}`);
    } else {
      console.log(`[FOUND] Table: ${table} - Data:`, data);
    }
  }
}

discover();
