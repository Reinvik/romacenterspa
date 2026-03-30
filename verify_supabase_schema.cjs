const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'client_romaspa' }
});

async function listTables() {
  try {
    // List tables in the schema by querying pg_catalog (optional, trying romaspa_parts directly)
    console.log('Querying romaspa_parts from schema client_romaspa...');
    const { data: parts, error: partsError } = await supabase
      .from('romaspa_parts')
      .select('*')
      .limit(5);

    if (partsError) {
      console.error('Error fetching romaspa_parts:', partsError);
      
      console.log('Trying table "parts" instead...');
      const { data: altParts, error: altError } = await supabase
        .from('parts')
        .select('*')
        .limit(5);
      
      if (altError) {
        console.error('Error fetching parts:', altError);
      } else {
        console.log('Successfully fetched from "parts":', altParts);
      }
    } else {
      console.log('Successfully fetched from "romaspa_parts":', parts);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

listTables();
