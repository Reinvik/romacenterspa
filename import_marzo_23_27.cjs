const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const supabaseUrl = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const supabaseKey = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'client_romaspa' }
});

const COMPANY_ID = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';

async function run() {
  const data = JSON.parse(fs.readFileSync('c:\\\\Proyectos\\\\Romacenterspa\\\\missing_marzo.json', 'utf8'));
  
  for (const item of data) {
    const rut = item.patente + '_HISTORIAL';
    
    // Now insert the ticket
    let { error: ticketError } = await supabase
      .from('romaspa_tickets')
      .insert({
        id: crypto.randomUUID(), 
        company_id: COMPANY_ID,
        patente: item.patente,
        owner_name: item.nombre || 'Historial',
        owner_phone: item.telefono || '000000000',
        notes: `TICKET HISTORICO MIGRADO\nFecha Original: ${item.date}\nDetalles Excel: ${item.detalles}`,
        status: 'ENTREGADO',
        entry_date: item.date,
        cost: item.costo || 0,
        mechanic: null
      });

    if (ticketError) {
      console.error('Error inserting ticket for', item.patente, ticketError);
    } else {
      console.log('Successfully inserted missing ticket for', item.patente, 'on date', item.date);
    }
  }

  console.log('Import process complete!');
}

run();
