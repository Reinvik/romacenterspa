import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://iuzpgljjfeobxlptmsma.supabase.co';
const STAGING_KEY = 'sb_publishable_SPDWhx5zkQ9y3SiG6FXUhA_1A6ylpl7';

const staging = createClient(STAGING_URL, STAGING_KEY);

async function checkProfiles() {
  const { data, error } = await staging.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error selecting from profiles:', error);
  } else if (data && data.length > 0) {
    console.log('Sample data from profiles:', data[0]);
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('Profiles table exists but is empty.');
  }
}

checkProfiles();
