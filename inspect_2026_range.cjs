const XLSX = require('xlsx');

const filePath = 'c:\\\\Proyectos\\\\Romacenterspa\\\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = 'ENERO -FEBRERO-MARZO-ABRIL 2026';
const worksheet = workbook.Sheets[sheetName];

if (worksheet) {
    console.log("Sheet Range:", worksheet['!ref']);
    
    // Specifically check cell U2 (index 20, row 1)
    const sampleCell = worksheet['U2'];
    console.log("Cell U2:", sampleCell ? sampleCell.v : "Empty");

    // Let's force a larger range if possible or just use a different approach
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "A1:Z3000", defval: null });
    
    let mappingsFound = 0;
    const mechanicsFound = new Set();

    data.forEach((row, i) => {
        if (i < 1) return;
        const ticketId = row[1];
        const mechanic = row[20];

        if (ticketId && typeof ticketId === 'string' && /^[A-Z0-9]{6}$/.test(ticketId)) {
            if (mechanic) {
                mappingsFound++;
                mechanicsFound.add(mechanic.toString().trim().toUpperCase());
            }
        }
    });

    console.log("Forced Range Scanned. Mappings Found:", mappingsFound);
    console.log("Mechanics:", Array.from(mechanicsFound).join(', '));
} else {
    console.log("Sheet not found!");
}
