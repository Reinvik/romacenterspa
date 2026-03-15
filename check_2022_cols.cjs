const XLSX = require('xlsx');

const filePath = 'c:\\Proyectos\\Romacenterspa\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['2022nOVIEMBRE-DICIEMBRE -ENERO'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Row 2 (Header) Index 15-25:', data[2].slice(15, 26));
console.log('Row 37 (Sample) Index 15-25:', data[37].slice(15, 26));
