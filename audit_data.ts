import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COMPANY_ID = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';

async function audit() {
  console.log('--- Auditing Garage Tickets (Roma Center) ---');
  
  const { data: tickets, error } = await supabase
    .from('garage_tickets')
    .select('id, owner_name, model')
    .eq('company_id', COMPANY_ID);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const brandsDetected = [];
  const patterns = [/^[A-Z]{3,}$/, /TOYOTA/i, /KIA/i, /DAHIATSU/i, /DAIHATSU/i, /HYUNDAI/i, /CHEVROLET/i, /SUZUKI/i, /FORD/i];

  for (const t of tickets || []) {
    // If ID is all letters and > 4 chars, or matches brand pattern
    if (/^[A-Z]{7,}$/.test(t.id) || patterns.some(p => p.test(t.id))) {
      // Exclude valid Chilean patentes (usually 6 chars like AAAA12 or AA1234)
      if (t.id.length > 6 || !/\d/.test(t.id)) {
        brandsDetected.push(t);
      }
    }
  }

  console.log(`Potential Brand-IDs found: ${brandsDetected.length}`);
  console.log(JSON.stringify(brandsDetected.slice(0, 20), null, 2));
}

audit();
