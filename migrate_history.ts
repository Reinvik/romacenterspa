import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'garage' }
});

const filePath = 'C:/Proyectos/nexus-garage-v2/HISTORIAL VEHICULOS.xlsb.xlsx';
const targetSheetName = "ENERO -FEBRERO-MARZO-ABRIL 2026";
const COMPANY_ID = '42dfd0fc-8894-4dd1-bc1a-c685633f02d8'; // ID REAL de Roma Center

async function migrate() {
  console.log('--- Iniciando Migración Corregida ---');
  
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[targetSheetName];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const customersToInsert: Map<string, any> = new Map();
  const ticketsToInsert: Map<string, any> = new Map();

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const fechaExcel = row[0];
    const patente = row[1];
    const marca = row[2];
    const modelo = row[3];
    const clienteNombre = row[7];
    const clienteTelefono = row[8] ? String(row[8]).replace(/\D/g, '') : '';
    const total = row[18];

    if (!patente || !clienteNombre) continue;
    const patenteLimpia = String(patente).toUpperCase().trim();

    const customerKey = `${clienteNombre}-${clienteTelefono}`;
    if (!customersToInsert.has(customerKey)) {
      customersToInsert.set(customerKey, {
        company_id: COMPANY_ID,
        name: clienteNombre,
        phone: clienteTelefono,
        vehicles: [patenteLimpia],
        last_model: modelo || marca,
        last_visit: excelDateToISO(fechaExcel)
      });
    }

    const visitDate = excelDateToISO(fechaExcel).split('T')[0];
    const detalles = [];
    for (let j = 9; j <= 16; j++) if (row[j]) detalles.push(row[j]);
    const visitEntry = `[${visitDate}] ${detalles.join(", ")} ($${total || 0})`;

    if (!ticketsToInsert.has(patenteLimpia)) {
      ticketsToInsert.set(patenteLimpia, {
        id: patenteLimpia,
        company_id: COMPANY_ID,
        model: modelo || marca || 'Vehículo Importado',
        status: 'Finalizado',
        owner_name: clienteNombre,
        owner_phone: clienteTelefono,
        entry_date: excelDateToISO(fechaExcel),
        close_date: excelDateToISO(fechaExcel),
        notes: `Historial de Visitas:\n- ${visitEntry}`,
        cost: typeof total === 'number' ? total : 0,
        quotation_total: typeof total === 'number' ? total : 0,
        quotation_accepted: true
      });
    } else {
      const existing = ticketsToInsert.get(patenteLimpia);
      existing.notes += `\n- ${visitEntry}`;
      if (new Date(excelDateToISO(fechaExcel)) > new Date(existing.close_date)) {
        existing.close_date = excelDateToISO(fechaExcel);
      }
    }
  }

  console.log(`Insertando ${customersToInsert.size} clientes...`);
  await supabase.from('customers').insert(Array.from(customersToInsert.values()));
  
  console.log(`Insertando ${ticketsToInsert.size} tickets de historial...`);
  await supabase.from('tickets').upsert(Array.from(ticketsToInsert.values()), { onConflict: 'id' });

  console.log('✅ Migración finalizada con el ID correcto.');
}

function excelDateToISO(serial: any) {
  if (!serial) return new Date().toISOString();
  try {
    if (typeof serial === 'number') {
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return date.toISOString();
    }
    const d = new Date(serial);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch (e) { return new Date().toISOString(); }
}

migrate().catch(console.error);
