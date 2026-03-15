const XLSX = require('xlsx');

const filePath = 'c:\\Proyectos\\Romacenterspa\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);

workbook.SheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`--- Sheet: ${name} ---`);
    console.log('Rows 1-5 sample:');
    for (let i = 0; i < Math.min(5, data.length); i++) {
        console.log(`Row ${i}:`, JSON.stringify(data[i]));
    }
});
