import XLSX from 'xlsx';

const filePath = 'C:/Proyectos/Romacenterspa/HISTORIAL VEHICULOS.xlsb.xlsx';
const targetSheets = [
  'SEPT-OCTUB-NOVIEM-DIC 2025',
  'ENERO -FEBRERO-MARZO-ABRIL 2026'
];

async function inspect() {
  const workbook = XLSX.readFile(filePath);
  for (const sheetName of targetSheets) {
    console.log(`--- Inspecting Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Print first 12 rows to see headers and data
    for (let i = 0; i < 12; i++) {
       if (!data[i]) continue;
       const rowStr = data[i].map((val, idx) => `[${idx}]:${val}`).join(' | ');
       console.log(`Row ${i}: ${rowStr.substring(0, 500)}...`);
    }
  }
}

inspect();
