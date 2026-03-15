import XLSX from 'xlsx';

const filePath = 'C:/Proyectos/Romacenterspa/HISTORIAL VEHICULOS.xlsb.xlsx';

async function findValues() {
  const workbook = XLSX.readFile(filePath);
  const searchValues = ['999599619'];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    let found = false;
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;
        
        const matches = row.some(val => 
            val !== null && 
            val !== undefined && 
            searchValues.some(sv => String(val).includes(sv))
        );

        if (matches) {
            console.log(`--- Found in Sheet: [${sheetName}], Row: [${i}] ---`);
            console.log(row.map((val, idx) => `[${idx}]: ${val}`).join(' | '));
            found = true;
            // Stop after first few matches in a sheet to avoid flooding
            if (i > 50) break; 
        }
    }
  }
}

findValues();
