import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COMPANY_ID = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';

async function finalAudit() {
  console.log('--- Final Record Count Audit ---');
  
  const { count: ticketCount, error: tErr } = await supabase
    .from('garage_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', COMPANY_ID);

  const { count: customerCount, error: cErr } = await supabase
    .from('garage_customers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', COMPANY_ID);

  if (tErr || cErr) {
    console.error('Audit failed:', tErr || cErr);
    return;
  }

  console.log(`Vehicles (Unique IDs): ${ticketCount}`);
  console.log(`Customers: ${customerCount}`);
}

finalAudit();
