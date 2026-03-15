const XLSX = require('xlsx');

const filePath = 'c:\\\\Proyectos\\\\Romacenterspa\\\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = 'ENERO -FEBRERO-MARZO-ABRIL 2026';
const worksheet = workbook.Sheets[sheetName];

const mechanics = ['ALEXANDER', 'FELIPE', 'DIEGO'];

if (worksheet) {
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "A1:AM2009", defval: null });
    const mapping = {};
    const columnDistribution = {};

    data.forEach((row, i) => {
        const ticketId = row[1];
        if (ticketId && typeof ticketId === 'string' && /^[A-Z0-9]{6}$/.test(ticketId)) {
            // Search the whole row for a mechanic name
            row.forEach((cell, idx) => {
                if (cell && typeof cell === 'string') {
                    const cleanCell = cell.trim().toUpperCase();
                    if (mechanics.includes(cleanCell)) {
                        mapping[ticketId] = cleanCell;
                        columnDistribution[idx] = (columnDistribution[idx] || 0) + 1;
                    }
                }
            });
        }
    });

    console.log("Total Mappings Found by string search:", Object.keys(mapping).length);
    console.log("Column Distribution of Names:", JSON.stringify(columnDistribution));
    
    // Sample first 20 findings
    const sample = Object.entries(mapping).slice(0, 20);
    console.log("Sample Findings:", JSON.stringify(Object.fromEntries(sample)));
} else {
    console.log("Sheet not found!");
}
