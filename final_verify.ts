import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COMPANY_ID = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';

async function verify() {
  console.log('--- Final Validation: Lazaro Gonzales Check ---');
  
  const { data: customer, error: cErr } = await supabase
    .from('garage_customers')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .ilike('name', '%Lazaro Gonzales%')
    .maybeSingle();

  if (cErr) console.error('Error fetching customer:', cErr);
  if (customer) {
    console.log('Customer Found:');
    console.log(`- Name: ${customer.name}`);
    console.log(`- Phone: ${customer.phone}`);
    console.log(`- Vehicles: ${customer.vehicles}`);
  } else {
    console.log('Lazaro Gonzales NOT FOUND.');
  }

  console.log('\n--- Checking for brands in Patente field ---');
  const { count, error: countErr } = await supabase
    .from('garage_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', COMPANY_ID)
    .in('id', ['TOYOTA', 'KIA', 'SUZUKI', 'RENAULT']);

  if (countErr) console.error('Error counting brand-ids:', countErr);
  console.log(`Tickets with Brand as ID: ${count}`);
}

verify();
