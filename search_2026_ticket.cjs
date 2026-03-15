const XLSX = require('xlsx');

const filePath = 'c:\\\\Proyectos\\\\Romacenterspa\\\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = 'ENERO -FEBRERO-MARZO-ABRIL 2026';
const worksheet = workbook.Sheets[sheetName];

const targetId = process.argv[2];

if (worksheet) {
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "A1:AM2009", defval: null });
    data.forEach((row, i) => {
        if (row && row.includes(targetId)) {
            console.log(`Found ${targetId} at row ${i}:`, JSON.stringify(row.slice(0, 25)));
        }
    });
} else {
    console.log("Sheet not found!");
}
