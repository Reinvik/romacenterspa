import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const supabaseKey = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu'; // From .env

const supabase = createClient(supabaseUrl, supabaseKey);

import XLSX from 'xlsx';
const filePath = 'C:/Proyectos/Romacenterspa/HISTORIAL VEHICULOS.xlsb.xlsx';

async function check() {
  try {
    console.log('--- Database Check ---');
    const { data: companies, error: cError } = await supabase.from('companies').select('id, name');
    console.log('Companies:', companies, 'Error:', cError);

    const { data: settings, error: sError } = await supabase.from('garage_settings').select('company_id').limit(1);
    console.log('Settings Data:', settings, 'Error:', sError);
    
    console.log('--- Database Counts ---');
    const { count: tCount, error: tE } = await supabase.from('garage_tickets').select('*', { count: 'exact', head: true }).eq('company_id', 'e7f8c91b-d532-4540-8a46-891f2f30a1d6');
    console.log('Tickets in Supabase:', tCount, 'Error:', tE);
    
    const { count: cCount, error: cE } = await supabase.from('garage_customers').select('*', { count: 'exact', head: true }).eq('company_id', 'e7f8c91b-d532-4540-8a46-891f2f30a1d6');
    console.log('Customers in Supabase:', cCount, 'Error:', cE);
    
  } catch (e) {
    console.error('Fatal error:', e);
  }
}

check();
