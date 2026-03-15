const XLSX = require('xlsx');

const filePath = 'c:\\\\Proyectos\\\\Romacenterspa\\\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = 'ENERO -FEBRERO-MARZO-ABRIL 2026';
const worksheet = workbook.Sheets[sheetName];

const mapping = {};

if (worksheet) {
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    data.forEach((row, i) => {
        // Skip header rows or empty rows
        if (i < 2) return; 

        const ticketId = row[1];
        const mechanic = row[20];

        // Basic validation for Ticket ID (usually 6 chars, uppercase)
        if (ticketId && typeof ticketId === 'string' && ticketId.length === 6 && /^[A-Z0-9]+$/.test(ticketId)) {
            if (mechanic) {
                mapping[ticketId] = mechanic.trim();
            }
        }
    });
    console.log(JSON.stringify(mapping, null, 2));
} else {
    console.log("Sheet not found!");
}
