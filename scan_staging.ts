import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://iuzpgljjfeobxlptmsma.supabase.co';
const STAGING_KEY = 'sb_publishable_SPDWhx5zkQ9y3SiG6FXUhA_1A6ylpl7';

const staging = createClient(STAGING_URL, STAGING_KEY);

async function scan() {
  const tables = [
    'garage_customers', 'garage_reminders', 'garage_tickets', 'garage_settings',
    'tickets', 'reminders', 'customers', 'vehicles'
  ];

  for (const t of tables) {
    const { data, error } = await staging.from(t).select('*').limit(1);
    if (error) {
      console.log(`[X] ${t}: ${error.message} (${error.code})`);
    } else {
      console.log(`[O] ${t}: Found ${data.length} rows`);
    }
  }
}

scan();
