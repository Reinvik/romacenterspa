import XLSX from 'xlsx';
const { readFile, utils } = XLSX;
import * as path from 'path';

function debugExcel() {
  const excelPath = path.join(process.cwd(), 'inventario.xlsx');
  const workbook = readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[] = utils.sheet_to_json(worksheet);
  
  console.log('--- Cabeceras Detectadas ---');
  if (jsonData.length > 0) {
    console.log(Object.keys(jsonData[0]));
    console.log('--- Primeras 2 Filas ---');
    console.log(JSON.stringify(jsonData.slice(0, 2), null, 2));
  } else {
    console.log('El archivo está vacío.');
  }
}

debugExcel();
