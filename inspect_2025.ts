import XLSX from 'xlsx';

const filePath = 'C:/Proyectos/nexus-garage-v2/HISTORIAL VEHICULOS.xlsb.xlsx';
const targetSheetName = "SEPT-OCTUB-NOVIEM-DIC 2025";

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[targetSheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Primeras 5 filas:', JSON.stringify(data.slice(0, 5), null, 2));
} catch (error) {
  console.error('Error:', error);
}
