
const XLSX = require('xlsx');
const path = require('path');

async function inspectSheet() {
  const filePath = path.join(process.cwd(), 'HISTORIAL VEHICULOS.xlsb.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'GARANTÍAS Y ABONOS';
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    console.error(`Sheet "${sheetName}" not found. Available sheets:`, workbook.SheetNames);
    return;
  }

  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log('Headers:', data[0]);
  console.log('Sample Data (First 3 rows):', data.slice(1, 4));
}

inspectSheet().catch(console.error);
