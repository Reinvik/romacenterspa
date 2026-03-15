const XLSX = require('xlsx');

const filePath = 'c:\\Proyectos\\Romacenterspa\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);

const targetId = 'FFTJ11';

workbook.SheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    data.forEach((row, index) => {
        if (JSON.stringify(row).includes(targetId)) {
            console.log(`Found in Sheet: ${name}, Row: ${index}`);
            console.log('Row content:', JSON.stringify(row));
        }
    });
});
