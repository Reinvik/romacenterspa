const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const supabaseKey = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'client_romaspa' }
});

const COMPANY_ID = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';

function excelDateToISO(serial) {
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

async function run() {
  const filePath = 'c:\\\\Proyectos\\\\Romacenterspa\\\\HISTORIAL VEHICULOS.xlsb.xlsx';
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets['Marzo 2026'];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // fetch exactly what is in DB
  const { data: dbTickets, error } = await supabase
    .from('romaspa_tickets')
    .select('patente, entry_date, cost');
  
  if (error) {
    console.error('Error fetching tickets:', error);
    return;
  }

  const toInsert = [];
  const processed = new Set(); 

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const fechaExcel = row[0];
    const patente = String(row[1] || '').trim().toUpperCase();
    const isVenta = patente.includes('VENTA');

    if (!fechaExcel || !patente || patente === 'NULL' || patente === '') continue;

    const isoDate = excelDateToISO(fechaExcel);
    const day = new Date(isoDate).getDate();
    const month = new Date(isoDate).getMonth() + 1; // 1-based Month
    const total = row[18] || row[19] || 0; // TOTAL or ESTATUS VENTA
    
    // We care about dates 23 to 27 or sales
    // We already synced all sales across March in previous step, so 'isVenta' shouldn't yield new things unless it wasn't there before, but no harm in double checking.
    if (month === 3 && ((day >= 23 && day <= 27) || isVenta)) {
      
      const exists = dbTickets.find(t => {
        const tDate = new Date(t.entry_date);
        return t.patente === patente && 
               tDate.getDate() === day &&
               tDate.getMonth() + 1 === month && 
               tDate.getFullYear() === 2026;
      });

      if (!exists) {
        const detalles = [];
        for (let j = 9; j <= 17; j++) if (row[j]) detalles.push(row[j]);
        
        toInsert.push({
          row: i+1,
          date: isoDate.split('T')[0],
          patente,
          marca: row[2],
          modelo: row[3],
          nombre: row[7],
          telefono: row[8],
          detalles: detalles.join(', '),
          costo: total
        });
      }
    }
  }

  console.log(`Found ${toInsert.length} records missing in Supabase (days 23-27).`);
  fs.writeFileSync('c:\\\\Proyectos\\\\Romacenterspa\\\\missing_marzo.json', JSON.stringify(toInsert, null, 2));
}

run();
