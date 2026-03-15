import XLSX from 'xlsx';

const filePath = 'C:/Proyectos/Romacenterspa/HISTORIAL VEHICULOS.xlsb.xlsx';
const targetSheet = 'SEPT-OCTUB-NOVIEM-DIC 2025';

async function scan() {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[targetSheet];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`Scanning sheet: ${targetSheet}`);
  
  let count = 0;
  for (let i = 2; i < data.length && count < 10; i++) {
    const row = data[i];
    if (!row || !row[1] || String(row[1]).toUpperCase() === 'VENTA') continue;
    
    console.log(`--- Row ${i} (Patente: ${row[1]}) ---`);
    row.forEach((val, idx) => {
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        console.log(`[${idx}]: ${val}`);
      }
    });
    count++;
  }
}

scan();
