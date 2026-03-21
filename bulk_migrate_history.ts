import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const filePath = 'C:/Proyectos/Romacenterspa/HISTORIAL VEHICULOS.xlsb.xlsx';
const COMPANY_ID = '42dfd0fc-8894-4dd1-bc1a-c685633f02d8';

const targetSheets = [
  '2022nOVIEMBRE-DICIEMBRE -ENERO',
  '2022 FEBRERO-MARZO-ABRIL-MAYO-J',
  '2023 jULIO AGOSTO SEPTIEMBRE',
  '2023OCTUBRE-NOVIEMBRE-DICIEMBRE',
  '2024EN-FEB-MAR-ABR-MAY',
  'JUNIO JULIO AGOSTO SEPT OCTUBRE',
  'ENERO-AGOSTO 2024',
  'ENERO-FEBRERO-MARZO-ABRIL2025',
  'MAYO-JUNIO-JULIO-AGOSTO',
  'SEPT-OCTUB-NOVIEM-DIC 2025',
  'ENERO -FEBRERO-MARZO-ABRIL 2026'
];

const BRANDS = ['TOYOTA', 'KIA', 'HYUNDAI', 'RENAULT', 'PEUGEOT', 'CITROEN', 'SUZUKI', 'FORD', 'CHEVROLET', 'NISSAN', 'MAZDA', 'JEEP', 'MG', 'BAIC', 'SUBARU', 'GREAT WALL', 'CHEVY', 'VOLKSWAGEN', 'AUDI', 'BMW', 'HONDA', 'MITSUBISHI', 'FIAT'];

async function bulkMigrate() {
  console.log('--- Iniciando Re-Migración Inteligente Roma Center ---');
  
  const workbook = XLSX.readFile(filePath);
  const ticketsToUpsert: Map<string, any> = new Map();
  const customersToUpsert: Map<string, any> = new Map();

  for (const sheetName of targetSheets) {
    if (!workbook.Sheets[sheetName]) {
      console.warn(`⚠️ Hoja no encontrada: ${sheetName}`);
      continue;
    }

    console.log(`Procesando Hoja: ${sheetName}...`);
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // 1. Detectar Mapeo de Columnas
    let mapping = findMapping(data);
    console.log(`- Mapeo detectado: ${JSON.stringify(mapping)}`);

    // 2. Procesar Filas (empezar después de los encabezados)
    const startIndex = mapping.headerRow + 1;
    for (let i = startIndex; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;

      let dateRaw = row[mapping.date];
      let patenteRaw = row[mapping.patente];
      let brandRaw = row[mapping.brand];
      let modelRaw = row[mapping.model];
      let engineRaw = row[mapping.engine];
      let yearRaw = row[mapping.year];
      let mileageRaw = row[mapping.mileage];
      let nameRaw = row[mapping.name];
      let phoneRaw = row[mapping.phone];
      let totalRaw = row[mapping.total];

      // --- SANITIZACIÓN INTELIGENTE ---
      
      let patente = String(patenteRaw || '').toUpperCase().trim();
      let brand = String(brandRaw || '').toUpperCase().trim();
      let model = String(modelRaw || '').trim();
      let name = String(nameRaw || 'Cliente Histórico').trim();
      let phone = phoneRaw ? String(phoneRaw).replace(/\D/g, '') : '';

      // Regla 1: Si la patente es una marca, probablemente los datos están desplazados
      if (BRANDS.includes(patente) || patente.length > 8) {
        // En "JUNIO JULIO AGOSTO SEPT OCTUBRE", row[1] es Marca, row[2] es Modelo... y Patente falta.
        // Pero a veces la patente está en row[1] y Brand en row[2].
        // Si row[1] es marca, asumimos desplazamiento:
        if (BRANDS.includes(patente)) {
            brand = patente;
            model = String(brandRaw || '');
            // Buscamos si la patente está en algún otro lado o simplemente no está
            patente = 'SIN-PATENTE-' + i + '-' + sheetName.substring(0, 5); 
        }
      }

      // Regla 2: Si el nombre parece un teléfono y el teléfono está vacío/inválido
      if (/^\d{7,}$/.test(name) && (!phone || phone.length < 5)) {
        phone = name;
        name = 'Cliente Histórico';
      }
      
      // Regla 3: Si el teléfono tiene letras y el nombre es corto, quizás están al revés
      if (phoneRaw && /[a-zA-Z]/.test(String(phoneRaw)) && nameRaw && !/[a-zA-Z]/.test(String(nameRaw))) {
        let temp = name;
        name = String(phoneRaw).trim();
        phone = String(temp).replace(/\D/g, '');
      }

      // Evitar ruidos comunes
      if (!patente || patente === 'NULL' || patente === 'VENTA' || patente === 'MESON' || patente.length < 3) continue;
      if (patente.includes('FACTURA') || patente.includes('BOLETA')) continue;

      const isoDate = excelDateToISO(dateRaw);
      const visitDateStr = isoDate.split('T')[0];

      // Construir modelo enriquecido
      const fullModel = [brand, model, engineRaw ? `${engineRaw}` : null, yearRaw ? `${yearRaw}` : null]
        .filter(v => v !== null && String(v).trim() !== '' && String(v) !== 'undefined')
        .map(v => String(v).trim())
        .join(' ');

      // Detalles del servicio (heurística: recolectar columnas entre el final del auto y el total)
      const detalles = [];
      const detailStart = Math.max(mapping.brand, mapping.model, mapping.year, mapping.mileage, mapping.name, mapping.phone) + 1;
      const detailEnd = mapping.total - 1;
      for (let j = detailStart; j <= detailEnd; j++) {
        if (row[j] && String(row[j]).trim()) detalles.push(String(row[j]).trim());
      }
      const visitEntry = `[${visitDateStr}] ${detalles.join(", ")} ($${Number(totalRaw || 0).toLocaleString('es-CL')})`;

      // 1. TICKET
      if (!ticketsToUpsert.has(patente)) {
        ticketsToUpsert.set(patente, {
          id: patente,
          company_id: COMPANY_ID,
          model: fullModel || 'Vehículo Histórico',
          status: 'Finalizado',
          owner_name: name,
          owner_phone: phone,
          entry_date: isoDate,
          close_date: isoDate,
          notes: `Historial de Visitas:\n- ${visitEntry}`,
          mileage: typeof mileageRaw === 'number' ? Math.round(mileageRaw) : null,
          cost: typeof totalRaw === 'number' ? totalRaw : 0,
          quotation_total: typeof totalRaw === 'number' ? totalRaw : 0,
          quotation_accepted: true
        });
      } else {
        const existing = ticketsToUpsert.get(patente);
        if (!existing.notes.includes(visitEntry)) {
          existing.notes += `\n- ${visitEntry}`;
        }
        if (new Date(isoDate) > new Date(existing.close_date)) {
          existing.close_date = isoDate;
          existing.model = fullModel || existing.model;
          existing.owner_name = name !== 'Cliente Histórico' ? name : existing.owner_name;
          existing.owner_phone = phone || existing.owner_phone;
          existing.mileage = typeof mileageRaw === 'number' ? Math.round(mileageRaw) : existing.mileage;
        }
      }

      // 2. CLIENTE
      const customerKey = `${name}-${phone}`.toLowerCase();
      if (!customersToUpsert.has(customerKey)) {
        customersToUpsert.set(customerKey, {
          company_id: COMPANY_ID,
          name: name,
          phone: phone,
          vehicles: [patente],
          last_model: fullModel || 'Vehículo Histórico',
          last_visit: isoDate,
          last_mileage: typeof mileageRaw === 'number' ? Math.round(mileageRaw) : null
        });
      } else {
        const existing = customersToUpsert.get(customerKey);
        if (!existing.vehicles.includes(patente)) {
          existing.vehicles.push(patente);
        }
        if (new Date(isoDate) > new Date(existing.last_visit)) {
          existing.last_visit = isoDate;
          existing.last_model = fullModel || existing.last_model;
          existing.last_mileage = typeof mileageRaw === 'number' ? Math.round(mileageRaw) : existing.last_mileage;
        }
      }
    }
  }

  console.log(`Resumen: ${ticketsToUpsert.size} Vehículos, ${customersToUpsert.size} Clientes.`);

  console.log('Subiendo Clientes...');
  const customers = Array.from(customersToUpsert.values());
  for (const chunk of chunkArray(customers, 50)) {
    const { error } = await supabase.from('garage_customers').upsert(chunk, { onConflict: 'company_id,name,phone' });
    if (error) console.error('Error Clientes:', error.message);
  }

  console.log('Subiendo Tickets...');
  const tickets = Array.from(ticketsToUpsert.values());
  for (const chunk of chunkArray(tickets, 50)) {
    const { error } = await supabase.from('garage_tickets').upsert(chunk, { onConflict: 'id' });
    if (error) console.error('Error Tickets:', error.message);
  }

  console.log('✅ Re-migración inteligente finalizada.');
}

function findMapping(data: any[][]) {
    // Default mapping (heuristic)
    let map = {
        headerRow: 1,
        date: 0,
        patente: 1,
        brand: 2,
        model: 3,
        engine: 4,
        year: 5,
        mileage: 6,
        name: 7,
        phone: 8,
        total: 18
    };

    // Intentar encontrar una fila de encabezado real (contiene "PATENTE", "MODELO", "NOMBRE", etc.)
    for (let i = 0; i < 5; i++) {
        const row = data[i];
        if (!row) continue;
        const rowStr = row.map(v => String(v).toUpperCase()).join('|');
        if (rowStr.includes('PATENTE') || rowStr.includes('PLACA') || rowStr.includes('MODELO')) {
           map.headerRow = i;
           row.forEach((cell, idx) => {
               const c = String(cell).toUpperCase();
               if (c.includes('FECHA')) map.date = idx;
               if (c.includes('PATENTE') || c.includes('PLACA')) map.patente = idx;
               if (c.includes('MARCA') || c === 'B') map.brand = idx;
               if (c.includes('MODELO')) map.model = idx;
               if (c.includes('CILIND')) map.engine = idx;
               if (c.includes('AÑO')) map.year = idx;
               if (c.includes('KILOM') || c.includes('KM')) map.mileage = idx;
               if (c.includes('NOMBRE') || c.includes('CLIENTE')) map.name = idx;
               if (c.includes('CELULAR') || c.includes('TELEF') || c.includes('FONO') || c === 'I') map.phone = idx;
               if (c.includes('TOTAL') || c === 'S') map.total = idx;
           });
           return map;
        }
    }

    // Ajuste heurístico si falla la detección de encabezado pero conocemos fallos específicos
    // (Ejemplo: En el scan vimos que row[1] a veces es Marca en vez de Patente)
    return map;
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

bulkMigrate().catch(console.error);
