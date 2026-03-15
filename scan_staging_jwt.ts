import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://iuzpgljjfeobxlptmsma.supabase.co';
// Usando la key JWT de nexus-projects
const STAGING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1enBnbGpqZmVvYnhscHRtc21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjY3NDAsImV4cCI6MjA4MjM0Mjc0MH0.7CK8fYBOiAjoxZXUw12VPbbNePjCQldSKXoVx_-ajXA';

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
