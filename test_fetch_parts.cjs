const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testFetch() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'client_romaspa' }
  });

  const { data, error, count } = await supabase
    .from('romaspa_parts')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log(`Fetched ${data.length} rows. Total count: ${count}`);
    if (data.length > 0) {
      console.log('Sample row:', data[0]);
    }
  }
}

testFetch();
