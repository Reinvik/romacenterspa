import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COMPANY_ID = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';

const BRANDS_TO_DELETE = [
    'TOYOTA', 'KIA', 'HYUNDAI', 'RENAULT', 'PEUGEOT', 'CITROEN', 'SUZUKI', 'FORD', 
    'CHEVROLET', 'NISSAN', 'MAZDA', 'JEEP', 'MG', 'BAIC', 'SUBARU', 'GREAT WALL', 
    'CHEVY', 'VOLKSWAGEN', 'AUDI', 'BMW', 'HONDA', 'MITSUBISHI', 'FIAT',
    'DAHIATSU', 'DAIHATSU', 'SAMNSUNG', 'SAMSUNG', 'GEELY', 'SEAT', 'MITSUBISHIO', 
    'CHNAAGN', 'CHANGAN', 'VENTAS', 'VENTYAS', 'MESON', 'JBDY', 'LXCL', 'DZBD', 
    'HBZK', 'JIN', 'HSXC', 'JFWT', 'MGZS'
];

async function cleanupBrands() {
  console.log('--- Cleaning up Brand-IDs from Garage Tickets ---');
  
  const { data: tickets, error: fetchError } = await supabase
    .from('garage_tickets')
    .select('id')
    .eq('company_id', COMPANY_ID);

  if (fetchError) {
    console.error('Error fetching tickets:', fetchError);
    return;
  }

  const idsToDelete = tickets
    .map(t => t.id)
    .filter(id => {
      const upperId = id.toUpperCase().trim();
      return BRANDS_TO_DELETE.includes(upperId) || 
             (upperId.length > 7 && !/\d/.test(upperId)) || // Likely a brand or word if long and no numbers
             upperId === 'MODELO' || upperId === 'MARCA';
    });

  console.log(`Found ${idsToDelete.length} records to delete:`, idsToDelete);

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('garage_tickets')
      .delete()
      .in('id', idsToDelete)
      .eq('company_id', COMPANY_ID);

    if (deleteError) {
      console.error('Error deleting records:', deleteError);
    } else {
      console.log('✅ Successfully deleted invalid brand-IDs.');
    }
  } else {
    console.log('No invalid records found to delete.');
  }
}

cleanupBrands();
