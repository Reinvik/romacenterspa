const XLSX = require('xlsx');

const filePath = 'c:\\\\Proyectos\\\\Romacenterspa\\\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = 'ENERO -FEBRERO-MARZO-ABRIL 2026';
const worksheet = workbook.Sheets[sheetName];

if (worksheet) {
    // sheet_to_json with header: 1 and defval: null ensures we get all columns as an array
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    const mapping = {};
    const uniqueMechanics = new Set();
    let rowsWithTickets = 0;

    data.forEach((row, i) => {
        if (i < 1) return; // Skip headers

        const ticketId = row[1];
        const mechanic = row[20];

        // Ticket ID is usually 6 alphanumeric characters
        if (ticketId && typeof ticketId === 'string' && /^[A-Z0-9]{6}$/.test(ticketId)) {
            rowsWithTickets++;
            if (mechanic && typeof mechanic === 'string') {
                const name = mechanic.trim().toUpperCase();
                if (name && name !== 'MECANICO' && name !== 'ESTATUS VENTA' && name !== 'NULL' && name !== 'FALSE') {
                    mapping[ticketId] = name;
                    uniqueMechanics.add(name);
                }
            }
        }
    });

    console.log("Total Rows in Sheet:", data.length);
    console.log("Rows with valid Ticket IDs:", rowsWithTickets);
    console.log("Mappings Found (Ticket -> Mechanic):", Object.keys(mapping).length);
    console.log("Unique Mechanics found in 2026:", Array.from(uniqueMechanics).join(', '));
    
    // Output a few mappings for verification
    const sample = Object.entries(mapping).slice(0, 10);
    console.log("Sample Mappings:", JSON.stringify(Object.fromEntries(sample)));

    // Save full mapping
    const fs = require('fs');
    fs.writeFileSync('/tmp/mechanic_mapping_2026.json', JSON.stringify(mapping));
} else {
    console.log("Sheet not found!");
}
