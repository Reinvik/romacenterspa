const XLSX = require('xlsx');

const filePath = 'c:\\\\Proyectos\\\\Romacenterspa\\\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = 'ENERO -FEBRERO-MARZO-ABRIL 2026';
const worksheet = workbook.Sheets[sheetName];

const mechanicFixMap = {
    'DEIGO': 'DIEGO',
    'ALEXANDERG': 'ALEXANDER',
    'ALEXANDER': 'ALEXANDER',
    'FELIPE': 'FELIPE',
    'DIEGO': 'DIEGO'
};

if (worksheet) {
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "A1:AM2009", defval: null });
    const finalMapping = {};
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const ticketId = row[1];

        if (ticketId && typeof ticketId === 'string' && /^[A-Z0-9]{6}$/.test(ticketId)) {
            let assignedMechanic = null;

            // 1. Check current row
            const mechInRow = row[20];
            if (mechInRow) {
                const clean = mechInRow.toString().trim().toUpperCase();
                if (mechanicFixMap[clean]) assignedMechanic = mechanicFixMap[clean];
            }

            // 2. If not found, look at subsequent rows while ID is null
            if (!assignedMechanic) {
                for (let j = i + 1; j < Math.min(i + 10, data.length); j++) {
                    const nextRow = data[j];
                    if (nextRow[1]) break; // Found a new ticket ID, stop looking

                    const nextMech = nextRow[20];
                    if (nextMech) {
                        const clean = nextMech.toString().trim().toUpperCase();
                        if (mechanicFixMap[clean]) {
                            assignedMechanic = mechanicFixMap[clean];
                            break;
                        }
                    }
                }
            }

            if (assignedMechanic) {
                finalMapping[ticketId] = assignedMechanic;
            }
        }
    }

    console.log("Total Tickets Found:", Object.keys(finalMapping).length);
    console.log("Sample Mappings:", JSON.stringify(Object.fromEntries(Object.entries(finalMapping).slice(0, 50))));
    
    const fs = require('fs');
    fs.writeFileSync('/tmp/mechanic_mapping_2026_v2.json', JSON.stringify(finalMapping));
} else {
    console.log("Sheet not found!");
}
