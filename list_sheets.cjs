const XLSX = require('xlsx');

const filePath = 'c:\\\\Proyectos\\\\Romacenterspa\\\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);
console.log("Sheet names found in workbook:");
workbook.SheetNames.forEach((name, i) => {
    console.log(`${i}: "${name}"`);
});
