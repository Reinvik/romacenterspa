const XLSX = require('xlsx');

const filePath = 'c:\\\\Proyectos\\\\Romacenterspa\\\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = 'ENERO -FEBRERO-MARZO-ABRIL 2026';
const worksheet = workbook.Sheets[sheetName];

const mechanics = ['ALEXANDER', 'FELIPE', 'DIEGO', 'DEIGO', 'ALEXANDERG'];

if (worksheet) {
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "A1:AM2009", defval: null });
    
    console.log("Analyzing 20 rows around a found mechanic:");
    data.forEach((row, i) => {
        let foundMech = null;
        row.forEach(cell => {
            if (cell && mechanics.includes(cell.toString().trim().toUpperCase())) {
                foundMech = cell.trim().toUpperCase();
            }
        });

        if (foundMech) {
            console.log(`--- Row ${i} (Found ${foundMech}) ---`);
            // Show current row
            console.log(`Current [${i}]: ID=${row[1]} | Mech=${row[20]} | All=${JSON.stringify(row.slice(0, 3))}`);
            // Show previous and next row
            if (i > 0) console.log(`Prev    [${i-1}]: ID=${data[i-1][1]} | Mech=${data[i-1][20]}`);
            if (i < data.length -1) console.log(`Next    [${i+1}]: ID=${data[i+1][1]} | Mech=${data[i+1][20]}`);
        }
    });
} else {
    console.log("Sheet not found!");
}
