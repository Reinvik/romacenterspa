const XLSX = require('xlsx');

const filePath = 'c:\\Proyectos\\Romacenterspa\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);

workbook.SheetNames.forEach(name => {
    if (name.toLowerCase().includes('202') || name.toLowerCase().includes('manten')) {
        const worksheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log(`--- Sheet: ${name} ---`);
        // Search for a header row (containing "MECANICO" or "DIEGO" or "Técnico")
        data.slice(0, 10).forEach((row, idx) => {
            console.log(`Row ${idx}:`, JSON.stringify(row).slice(0, 200));
        });
    }
});
