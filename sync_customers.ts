import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://iuzpgljjfeobxlptmsma.supabase.co';
const STAGING_KEY = 'sb_publishable_SPDWhx5zkQ9y3SiG6FXUhA_1A6ylpl7';

const PROD_URL = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const PROD_KEY = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';

const staging = createClient(STAGING_URL, STAGING_KEY);
const prod = createClient(PROD_URL, PROD_KEY);

async function sync() {
  console.log('--- INICIANDO SINCRONIZACIÓN DE CLIENTES ---');
  
  // 1. Obtener clientes de Staging
  const { data: customers, error: fetchError } = await staging
    .from('garage_customers')
    .select('*');

  if (fetchError) {
    console.error('Error al obtener clientes de Staging:', fetchError);
    return;
  }

  if (!customers || customers.length === 0) {
    console.log('No se encontraron clientes en Staging.');
    return;
  }

  console.log(`Encontrados ${customers.length} clientes en Staging.`);

  // 2. Procesar e Insertar/Upsert en Producción
  // Usamos el campo 'id' (patente) como clave única para el upsert
  let successCount = 0;
  let errorCount = 0;

  for (const customer of customers) {
    const { error: insertError } = await prod
      .from('garage_customers')
      .upsert(customer);

    if (insertError) {
      console.error(`Error al insertar cliente ${customer.id}:`, insertError);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log('--- RESUMEN ---');
  console.log(`Exitosos: ${successCount}`);
  console.log(`Errores: ${errorCount}`);
}

sync();
