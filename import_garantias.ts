
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const supabaseGarage = supabase.schema('client_romaspa');

const filePath = path.join(process.cwd(), 'HISTORIAL VEHICULOS.xlsb.xlsx');
const COMPANY_ID = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6'; // Roma Center SPA

async function importGarantias() {
  console.log('--- Iniciando Importación de Garantías y Abonos ---');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'GARANTÍAS Y ABONOS';
  
  if (!workbook.Sheets[sheetName]) {
    console.error(`Error: Hoja "${sheetName}" no encontrada.`);
    return;
  }

  const sheet = workbook.Sheets[sheetName];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Headers are at data[0]: [empty, 'FECHA', 'PATENTE', 'NOMBRE', 'DETALLE', 'MONTO', 'COMENTARIOS']
  const garantiasToInsert = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;

    const fechaRaw = row[1];
    const patente = String(row[2] || '').toUpperCase().trim();
    const nombre = String(row[3] || '').trim();
    const detalle = String(row[4] || '').trim();
    const monto = Number(row[5] || 0);
    const comentarios = String(row[6] || '').trim();

    if (!patente || patente === 'PATENTE') continue;

    const fecha = excelDateToISO(fechaRaw);
    if (!fecha) continue;

    garantiasToInsert.push({
      company_id: COMPANY_ID,
      fecha,
      patente,
      nombre: nombre || null,
      detalle: detalle || null,
      monto,
      comentarios: comentarios || null
    });
  }

  console.log(`Procesando ${garantiasToInsert.length} registros...`);

  // Insertar en bloques de 50
  for (let i = 0; i < garantiasToInsert.length; i += 50) {
    const chunk = garantiasToInsert.slice(i, i + 50);
    const { error } = await supabaseGarage.from('romaspa_garantias').insert(chunk);
    
    if (error) {
      console.error(`Error insertando bloque ${i/50}:`, error.message);
      if (error.message.includes('relation "romaspa_garantias" does not exist')) {
        console.error('CRITICAL: La tabla romaspa_garantias NO existe en el esquema client_romaspa.');
        return;
      }
    } else {
      console.log(`Bloque ${i/50 + 1} insertado con éxito.`);
    }
  }

  console.log('✅ Importación de garantías finalizada.');
}

function excelDateToISO(serial: any): string | null {
  if (!serial) return null;
  try {
    if (typeof serial === 'number') {
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    }
    const d = new Date(serial);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch (e) { return null; }
}

importGarantias().catch(console.error);
