const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'c:\\Proyectos\\Romacenterspa\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);

const mapping = {};

workbook.SheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Find header row to identify ID and MECANICO columns
    let idCol = -1;
    let mechCol = -1;
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i].map(c => String(c).toUpperCase());
        if (row.includes('PATENTE') || row.includes('ID')) {
            idCol = row.indexOf('PATENTE') !== -1 ? row.indexOf('PATENTE') : row.indexOf('ID');
            if (row.includes('MECANICO')) {
                mechCol = row.indexOf('MECANICO');
            } else {
                // Heuristic: mapping usually shows it at index 20 in newer sheets
                mechCol = 20; 
            }
            break;
        }
    }

    if (idCol !== -1) {
        data.forEach(row => {
            const id = row[idCol];
            const mechanic = row[mechCol];
            if (id && mechanic && typeof id === 'string' && id.length >= 4) {
                // Only map if mechanic is a valid-looking string (not a number or empty)
                if (typeof mechanic === 'string' && mechanic.trim().length > 1) {
                    mapping[id.trim()] = mechanic.trim();
                }
            }
        });
    }
});

console.log('--- DRY RUN: Mechanic Data Recovery ---');
console.log('Total unique mappings found in Excel:', Object.keys(mapping).length);

// Sample of mapping
const samples = Object.keys(mapping).slice(0, 10);
console.log('Sample mappings:');
samples.forEach(id => console.log(`  ${id} -> ${mapping[id]}`));

// Write mapping to file for next step
fs.writeFileSync('/tmp/mechanic_mapping.json', JSON.stringify(mapping, null, 2));
