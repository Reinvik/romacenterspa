const XLSX = require('xlsx');

const filePath = 'c:\\\\Proyectos\\\\Romacenterspa\\\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = 'ENERO -FEBRERO-MARZO-ABRIL 2026';
const worksheet = workbook.Sheets[sheetName];

if (worksheet) {
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log("Sheet found. Samples with indices:");
    // Sample rows 3 to 15 (skipping empty top rows if any)
    data.slice(0, 20).forEach((row, i) => {
        if (row && row.length > 0) {
            console.log(`Row ${i}:`, row.map((cell, idx) => `[${idx}] ${cell}`).join(' | '));
        }
    });
} else {
    console.log("Sheet not found!");
}
