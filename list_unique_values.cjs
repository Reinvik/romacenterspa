const XLSX = require('xlsx');

const filePath = 'c:\\\\Proyectos\\\\Romacenterspa\\\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = 'ENERO -FEBRERO-MARZO-ABRIL 2026';
const worksheet = workbook.Sheets[sheetName];

if (worksheet) {
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "A1:AM2009", defval: null });
    const col20Values = new Set();
    const col7Values = new Set();
    const col23Values = new Set();

    data.forEach((row, i) => {
        if (row[20]) col20Values.add(row[20].toString().trim());
        if (row[7]) col7Values.add(row[7].toString().trim());
        if (row[23]) col23Values.add(row[23].toString().trim());
    });

    console.log("Unique in Col 20 (U):", Array.from(col20Values).slice(0, 30));
    console.log("Unique in Col 7 (H):", Array.from(col7Values).slice(0, 30));
    console.log("Unique in Col 23 (X):", Array.from(col23Values).slice(0, 30));
} else {
    console.log("Sheet not found!");
}
