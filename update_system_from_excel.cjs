const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'client_romaspa' }
});

const COMPANY_ID = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';
const DRY_RUN = process.argv.includes('--dry-run');

function parsePrice(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  // Remove symbols and convert to number
  const cleaned = String(value).replace(/[$.]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function parseStock(value) {
  if (typeof value === 'number') return Math.floor(value);
  if (!value) return 0;
  // Remove comma and convert to number
  const cleaned = String(value).replace(',', '.');
  return Math.floor(parseFloat(cleaned)) || 0;
}

async function updateSystemFromExcel() {
  console.log(`--- Iniciando actualización de Inventario (Excel -> Sistema) ---`);
  if (DRY_RUN) console.log('>>> MODO SIMULACIÓN (DRY RUN): No se realizarán cambios en la base de datos.');

  try {
    const excelPath = path.join(__dirname, 'inventario.xlsx');
    console.log(`Leyendo archivo: ${excelPath}`);
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Filas detectadas en Excel: ${data.length}`);

    const updates = data.map(row => {
      const id = String(row['Código'] || '').trim();
      const name = String(row['Producto'] || '').trim();
      
      if (!id || !name) return null;

      return {
        id,
        name,
        stock: parseStock(row['Existencia']),
        price: parsePrice(row['P. Venta']),
        min_stock: parseStock(row['Inv. Mínimo']),
        location: String(row['Departamento'] || '').trim(),
        company_id: COMPANY_ID,
        created_at: new Date().toISOString()
      };
    }).filter(item => item !== null);

    console.log(`Registros válidos para procesar: ${updates.length}`);

    if (DRY_RUN) {
      console.log('--- Resumen de cambios (Muestra de los primeros 5) ---');
      console.log(updates.slice(0, 5));
      console.log('--- Fin del Dry Run ---');
      return;
    }

    // Process in batches of 100 to avoid request size limits
    const BATCH_SIZE = 100;
    let successCount = 0;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('romaspa_parts')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`Error en lote ${i / BATCH_SIZE + 1}:`, error.message);
      } else {
        successCount += batch.length;
        console.log(`Progreso: ${successCount} / ${updates.length}`);
      }
    }

    console.log('\n--- Actualización completada ---');
    console.log(`Total de registros procesados: ${successCount}`);

  } catch (err) {
    console.error('Error crítico durante el proceso:', err);
  }
}

updateSystemFromExcel();
