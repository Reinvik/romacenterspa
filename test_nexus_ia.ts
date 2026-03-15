import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://nexus-ia.supabase.co'; // Probando el nombre nexus-ia
const STAGING_KEY = 'sb_publishable_SPDWhx5zkQ9y3SiG6FXUhA_1A6ylpl7'; // Pruebo con la key de nexus-skills

const staging = createClient(STAGING_URL, STAGING_KEY);

async function testNexusIA() {
  const { data, error } = await staging.from('garage_customers').select('*').limit(1);
  if (error) {
    console.error('Error with nexus-ia:', error.message);
  } else {
    console.log('Success with nexus-ia! Found rows:', data.length);
  }
}

testNexusIA();
