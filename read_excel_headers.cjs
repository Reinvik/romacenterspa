const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:\\Proyectos\\Romacenterspa\\HISTORIAL VEHICULOS.xlsb.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Headers:', data[0]);
console.log('Sample Row:', data[1]);
