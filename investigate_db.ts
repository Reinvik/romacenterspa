import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const supabaseKey = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseGarage = supabase.schema('client_romaspa');

async function checkColumns() {
  console.log('Checking romaspa_tickets...');
  const { data: tickets, error: tErr } = await supabaseGarage.from('romaspa_tickets').select('*').limit(1);
  if (tErr) console.error('Error tickets:', tErr.message);
  else if (tickets.length > 0) console.log('Tickets columns:', Object.keys(tickets[0]));
  else console.log('No tickets found to check columns.');

  console.log('\nChecking romaspa_sala_ventas...');
  const { data: sales, error: sErr } = await supabaseGarage.from('romaspa_sala_ventas').select('*').limit(1);
  if (sErr) console.error('Error sales:', sErr.message);
  else if (sales.length > 0) console.log('Sales columns:', Object.keys(sales[0]));
  else console.log('No sales found to check columns.');
}

checkColumns();
