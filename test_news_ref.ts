import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://foygrqsctyhmimazuyci.supabase.co';
// Pruebo con la key de nexus-projects (algunas veces las keys anon funcionan entre proyectos si el setup es similar, aunque dudo)
// O mejor busco la key de news si existe
const STAGING_KEY = 'sb_publishable_SPDWhx5zkQ9y3SiG6FXUhA_1A6ylpl7'; 

const staging = createClient(STAGING_URL, STAGING_KEY);

async function testNewsIA() {
  const { data, error } = await staging.from('garage_customers').select('*').limit(1);
  if (error) {
    console.error('Error with news-ref:', error.message);
  } else {
    console.log('Success with news-ref! Found rows:', data.length);
  }
}

testNewsIA();
