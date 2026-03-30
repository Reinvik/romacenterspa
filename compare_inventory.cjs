const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Use default schema and specify it in the from() call
const supabase = createClient(supabaseUrl, supabaseKey);

async function compare() {
  try {
    console.log('Fetching database parts from client_romaspa.romaspa_parts...');
    const { data: dbParts, error } = await supabase
      .schema('client_romaspa')
      .from('romaspa_parts')
      .select('*');
      
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    if (!dbParts) {
      console.log('No parts found in DB.');
      return;
    }

    const excelPath = path.join(__dirname, 'inventario.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`DB Count: ${dbParts.length}`);
    console.log(`Excel Count: ${excelData.length}`);

    let matchCount = 0;
    const missingInDB = [];
    const stockDiffs = [];

    excelData.forEach(row => {
      const code = String(row['Código'] || '').trim();
      const name = String(row['Producto'] || '').trim();
      
      // Clean up stock value (sometimes it's "6,00")
      let excelStockText = String(row['Existencia'] || '0').replace(',', '.');
      const excelStock = parseFloat(excelStockText);
      
      const dbPart = dbParts.find(p => String(p.id).trim() === code || String(p.name).trim() === name);
      
      if (!dbPart) {
        missingInDB.push({ code, name });
      } else {
        matchCount++;
        if (Math.round(dbPart.stock) !== Math.round(excelStock)) {
          stockDiffs.push({ name, dbStock: dbPart.stock, excelStock });
        }
      }
    });

    console.log(`Total Matches: ${matchCount}`);
    console.log(`Missing in DB: ${missingInDB.length}`);
    console.log(`Stock differences: ${stockDiffs.length}`);

    if (stockDiffs.length > 0) {
      console.log('Sample stock diffs (Excel vs DB):');
      stockDiffs.slice(0, 10).forEach(d => {
        console.log(`- ${d.name}: Excel=${d.excelStock}, DB=${d.dbStock}`);
      });
    }
  } catch (err) {
    console.error('Execution Error:', err);
  }
}

compare();

