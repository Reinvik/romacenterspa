const XLSX = require('xlsx');

const filePath = 'c:\\Proyectos\\Romacenterspa\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);

workbook.SheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    data.slice(0, 10).forEach((row, idx) => {
        const rowStr = JSON.stringify(row).toUpperCase();
        if (rowStr.includes('MECANICO') || rowStr.includes('TÉCNICO') || rowStr.includes('TECNICO')) {
            console.log(`Found header match in Sheet: ${name}, Row: ${idx}`);
            console.log('Row:', JSON.stringify(row));
        }
    });
});
