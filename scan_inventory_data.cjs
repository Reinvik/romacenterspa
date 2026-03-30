const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
  try {
    const schemas = ['public', 'client_romaspa', 'auth', 'storage'];
    for (const schema of schemas) {
      console.log(`--- Checking schema: ${schema} ---`);
      const client = createClient(supabaseUrl, supabaseKey, {
        db: { schema: schema }
      });

      // Try to find inventory-like tables
      const likelyTables = ['parts', 'romaspa_parts', 'inventory', 'products', 'items', 'inventario'];
      for (const table of likelyTables) {
        const { data, error } = await client.from(table).select('*').limit(1);
        if (error) {
          // console.log(`Table ${table} not found in ${schema}`);
        } else if (data && data.length > 0) {
          console.log(`SUCCESS: Found data in ${schema}.${table}`);
          console.log('Sample:', data[0]);
        } else if (data && data.length === 0) {
           console.log(`Table ${schema}.${table} exists but is empty.`);
        }
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

listAllTables();
