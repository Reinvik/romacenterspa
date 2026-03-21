import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'garage' }
});

const filePath = 'C:/Proyectos/nexus-garage-v2/HISTORIAL VEHICULOS.xlsb.xlsx';
const targetSheetName = "SEPT-OCTUB-NOVIEM-DIC 2025";
const COMPANY_ID = '42dfd0fc-8894-4dd1-bc1a-c685633f02d8'; // Roma Center

async function migrate_2025() {
  console.log('--- Iniciando Migración 2025 (Sept-Dic) ---');
  
  // 1. Cargar estado actual de Supabase para evitar duplicados y consolidar
  console.log('Obteniendo datos actuales de Supabase...');
  const { data: existingTickets } = await supabase.from('tickets').select('id, notes, close_date, model, owner_name, owner_phone').eq('company_id', COMPANY_ID);
  const { data: existingCustomers } = await supabase.from('customers').select('id, name, phone, last_visit, vehicles').eq('company_id', COMPANY_ID);

  const ticketMap = new Map(existingTickets?.map(t => [t.id, t]) || []);
  const customerMap = new Map(existingCustomers?.map(c => [`${c.name}-${c.phone}`, c]) || []);

  // 2. Leer Excel
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[targetSheetName];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const customersToUpsert: Map<string, any> = new Map();
  const ticketsToUpsert: Map<string, any> = new Map();

  console.log(`Procesando ${data.length} filas...`);

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const fechaExcel = row[0];
    const patente = row[1];
    const marca = row[2];
    const modelo = row[3];
    const clienteNombre = row[7];
    const clienteTelefono = row[8] ? String(row[8]).replace(/\D/g, '') : '';
    const total = row[18];

    // Filtrar ventas de mesón y patentes inválidas
    if (!patente || String(patente).toUpperCase() === 'VENTA' || String(patente).toUpperCase() === 'MESON' || !clienteNombre) continue;
    
    const patenteLimpia = String(patente).toUpperCase().trim();
    const isoDate = excelDateToISO(fechaExcel);
    const visitDateStr = isoDate.split('T')[0];

    // Preparar entrada de historial
    const detalles = [];
    for (let j = 9; j <= 16; j++) if (row[j]) detalles.push(row[j]);
    const visitEntry = `[${visitDateStr}] ${detalles.join(", ")} ($${total || 0})`;

    // Lógica de TICKET (Vehículo)
    if (!ticketsToUpsert.has(patenteLimpia)) {
      const existing = ticketMap.get(patenteLimpia);
      if (existing) {
        // Consolidar en el ticket existente
        const notes = existing.notes || '';
        // Evitar duplicar la misma entrada si ya existía (por si acaso)
        if (!notes.includes(visitEntry)) {
          existing.notes = `\n- ${visitEntry}${notes.startsWith('Historial') ? '' : '\n'}${notes}`;
        }
        // Solo actualizar close_date si la de 2025 es más reciente (raro pero posible)
        if (new Date(isoDate) > new Date(existing.close_date)) {
          existing.close_date = isoDate;
          existing.model = modelo || marca || existing.model;
        }
        ticketsToUpsert.set(patenteLimpia, { ...existing, company_id: COMPANY_ID });
      } else {
        // Nuevo ticket para esta patente
        ticketsToUpsert.set(patenteLimpia, {
          id: patenteLimpia,
          company_id: COMPANY_ID,
          model: modelo || marca || 'Vehículo 2025',
          status: 'Finalizado',
          owner_name: clienteNombre,
          owner_phone: clienteTelefono,
          entry_date: isoDate,
          close_date: isoDate,
          notes: `Historial de Visitas:\n- ${visitEntry}`,
          cost: typeof total === 'number' ? total : 0,
          quotation_total: typeof total === 'number' ? total : 0,
          quotation_accepted: true
        });
      }
    } else {
      // Ya lo procesamos en este loop
      const pending = ticketsToUpsert.get(patenteLimpia);
      if (!pending.notes.includes(visitEntry)) {
        pending.notes += `\n- ${visitEntry}`;
      }
    }

    // Lógica de CLIENTE
    const customerKey = `${clienteNombre}-${clienteTelefono}`;
    if (!customersToUpsert.has(customerKey)) {
      const existing = customerMap.get(customerKey);
      if (existing) {
        // Actualizar cliente existente si la visita de 2025 es más reciente
        if (new Date(isoDate) > new Date(existing.last_visit)) {
          existing.last_visit = isoDate;
        }
        // Asegurar que la patente esté en su lista
        if (!existing.vehicles.includes(patenteLimpia)) {
          existing.vehicles.push(patenteLimpia);
        }
        customersToUpsert.set(customerKey, existing);
      } else {
        // Nuevo cliente
        customersToUpsert.set(customerKey, {
          company_id: COMPANY_ID,
          name: clienteNombre,
          phone: clienteTelefono,
          vehicles: [patenteLimpia],
          last_model: modelo || marca,
          last_visit: isoDate
        });
      }
    }
  }

  console.log(`Guardando ${customersToUpsert.size} clientes (actualizaciones/nuevos)...`);
  const customerList = Array.from(customersToUpsert.values());
  for (const chunk of chunkArray(customerList, 50)) {
    await supabase.from('customers').upsert(chunk, { onConflict: 'company_id,name,phone' });
  }

  console.log(`Guardando ${ticketsToUpsert.size} tickets consolidando historial...`);
  const ticketList = Array.from(ticketsToUpsert.values());
  for (const chunk of chunkArray(ticketList, 50)) {
    await supabase.from('tickets').upsert(chunk, { onConflict: 'id' });
  }

  console.log('✅ Migración 2025 finalizada con éxito.');
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

function chunkArray(array: any[], size: number) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

migrate_2025().catch(console.error);
