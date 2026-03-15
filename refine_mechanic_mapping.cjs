const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'c:\\Proyectos\\Romacenterspa\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);

const mapping = {};
const statusStrings = ['PAGADO', 'COBRADO', 'ENTREGADO', 'FINALIZADO', 'PENDIENTE', 'ANULADO', 'GARANTIA', 'POR PAGAR', 'MECANICO', 'TÉCNICO', 'TECNICO', 'ESTATUS', 'OTROS', 'OTROS_1', 'PATENTE', 'VENTA TOTAL'];

workbook.SheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    let idCol = -1;
    let mechCol = -1;
    
    // Scan up to 20 rows to find headers correctly
    for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = (data[i] || []).map(c => String(c || '').trim().toUpperCase());
        if (row.includes('PATENTE')) {
            idCol = row.indexOf('PATENTE');
            if (row.includes('MECANICO')) {
                mechCol = row.indexOf('MECANICO');
            } else {
                // Heuristic: check if column 20 exists and looks like a name holder
                mechCol = 20; 
            }
            break;
        }
    }

    if (idCol !== -1) {
        data.forEach(row => {
            const id = String(row[idCol] || '').trim().toUpperCase();
            const mechanic = String(row[mechCol] || '').trim().toUpperCase();
            
            if (id && id.length >= 4 && id !== 'PATENTE') {
                if (mechanic && mechanic.length > 1 && !statusStrings.includes(mechanic)) {
                    // Filter out numbers if any
                    if (!/^\d+$/.test(mechanic)) {
                        mapping[id] = mechanic;
                    }
                }
            }
        });
    }
});

console.log('Total mappings found after filtering:', Object.keys(mapping).length);
const finalSample = Object.keys(mapping).slice(0, 15);
finalSample.forEach(id => console.log(`  ${id} -> ${mapping[id]}`));

fs.writeFileSync('/tmp/mechanic_mapping_refined.json', JSON.stringify(mapping, null, 2));
