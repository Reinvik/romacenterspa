import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const COMPANY_ID = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';

async function cleanup() {
  console.log(`--- Iniciando Limpieza para Empresa: ${COMPANY_ID} ---`);
  
  try {
    // 1. Notifications
    await supabase.from('garage_notifications').delete().eq('company_id', COMPANY_ID);
    console.log('✅ Notificaciones eliminadas.');

    // 2. Reminders (agenda)
    await supabase.from('garage_reminders').delete().eq('company_id', COMPANY_ID);
    console.log('✅ Agenda eliminada.');

    // 3. Parts (could reference tickets)
    await supabase.from('garage_parts').delete().eq('company_id', COMPANY_ID);
    console.log('✅ Repuestos eliminados.');

    // 4. Tickets
    const { error: tError } = await supabase.from('garage_tickets').delete().eq('company_id', COMPANY_ID);
    if (tError) throw tError;
    console.log('✅ Tickets eliminados.');

    // 5. Customers
    const { error: cError } = await supabase.from('garage_customers').delete().eq('company_id', COMPANY_ID);
    if (cError) throw cError;
    console.log('✅ Clientes eliminados.');

    console.log('--- Limpieza Finalizada con Éxito ---');
  } catch (error) {
    console.error('Error durante la limpieza:', error);
  }
}

cleanup();
