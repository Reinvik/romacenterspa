import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const PROD_KEY = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';

const prod = createClient(PROD_URL, PROD_KEY);

async function checkSchemas() {
  // Intentar listar esquemas vía RPC si existe
  const { data, error } = await prod.rpc('get_schemas');
  if (error) {
    console.log('Error listing schemas via RPC, checking common tables in public...');
    const tables = ['garage_customers', 'customers', 'profiles'];
    for (const t of tables) {
      const { data: d, error: e } = await prod.from(t).select('*').limit(1);
      if (!e) {
        console.log(`[FOUND] public.${t}: ${d.length} rows`);
        if (d.length > 0) console.log('  Columns:', Object.keys(d[0]));
      } else {
        console.log(`[NOT FOUND] public.${t}: ${e.message}`);
      }
    }
  } else {
    console.log('Schemas:', data);
  }
}

checkSchemas();
