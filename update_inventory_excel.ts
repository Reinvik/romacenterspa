import XLSX from 'xlsx';
const { readFile, writeFile, utils } = XLSX;
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncInventoryToExcel() {
  console.log('--- Iniciando sincronización de inventario a Excel ---');
  
  try {
    // 1. Fetch current parts from Supabase
    const { data: remoteParts, error } = await supabase
      .from('garage_parts')
      .select('*');

    if (error) throw error;
    console.log(`Recuperados ${remoteParts.length} repuestos de Supabase.`);

    // 2. Read existing Excel file
    const excelPath = path.join(process.cwd(), 'inventario.xlsx');
    const workbook = readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON to manipulate easily
    const jsonData: any[] = utils.sheet_to_json(worksheet);
    console.log(`Leyendo ${jsonData.length} filas del archivo Excel.`);

    // 3. Update stock in JSON data
    let updateCount = 0;
    jsonData.forEach((row: any) => {
      // Mapping: Código -> id, Producto -> name
      const extCode = String(row['Código'] || '').trim();
      const extName = String(row['Producto'] || '').trim();

      const match = remoteParts.find(p => 
        (p.id && String(p.id).trim() === extCode) || 
        (p.name && String(p.name).trim() === extName)
      );
      
      if (match) {
        row['Existencia'] = match.stock;
        row['Inv. Mínimo'] = match.min_stock;
        // Price handling: value in Excel is "$32.000", value in DB is 32000
        row['P. Venta'] = `$${(match.price || 0).toLocaleString('de-DE')}`; 
        updateCount++;
      }
    });

    console.log(`Actualizadas ${updateCount} coincidencias en el JSON.`);

    // 4. Write back to Excel
    const newWorksheet = utils.json_to_sheet(jsonData);
    workbook.Sheets[sheetName] = newWorksheet;
    writeFile(workbook, excelPath);

    console.log('--- Sincronización completada exitosamente ---');
    console.log(`Archivo actualizado en: ${excelPath}`);
  } catch (err) {
    console.error('Error durante la sincronización:', err);
    process.exit(1);
  }
}

syncInventoryToExcel();
