const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'client_romaspa' }
});

async function sync() {
  console.log('Fetching parts from Supabase...');
  const { data: parts, error } = await supabase
    .from('romaspa_parts')
    .select('*');

  if (error) {
    console.error('Error fetching parts:', error);
    return;
  }

  console.log(`Fetched ${parts.length} parts.`);

  const excelPath = path.join(__dirname, 'inventario.xlsx');
  console.log(`Reading Excel from ${excelPath}...`);
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Get data as array of objects
  const data = XLSX.utils.sheet_to_json(worksheet);
  console.log(`Updating ${data.length} rows in Excel...`);

  let updatedCount = 0;
  const updatedData = data.map(row => {
    const code = String(row['Código'] || '').trim();
    const name = String(row['Producto'] || '').trim();

    // Try to find by code first, then by name
    const part = parts.find(p => p.id === code) || parts.find(p => p.name === name);

    if (part) {
      row['Existencia'] = part.stock;
      row['Inv. Mínimo'] = part.min_stock;
      // Format price to match "$X.XXX"
      row['P. Venta'] = `$${(part.price || 0).toLocaleString('de-DE')}`;
      updatedCount++;
    }
    return row;
  });

  console.log(`Matched and updated ${updatedCount} items.`);

  // Write back to Excel
  const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
  workbook.Sheets[sheetName] = newWorksheet;
  XLSX.writeFile(workbook, excelPath);

  console.log('Inventory Excel updated successfully!');
}

sync();
