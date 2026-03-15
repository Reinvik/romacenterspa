const XLSX = require('xlsx');

const filePath = 'c:\\\\Proyectos\\\\Romacenterspa\\\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = 'ENERO -FEBRERO -MARZO-ABRIL 2026';
const worksheet = workbook.Sheets[sheetName];

if (worksheet) {
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    // Look for a row that looks like headers or data
    console.log("Sheet found. Sampling first 15 rows:");
    data.slice(0, 15).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });
} else {
    console.log("Sheet not found!");
}
