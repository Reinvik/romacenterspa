import XLSX from 'xlsx';
import * as fs from 'fs';
import path from 'path';

const filePath = 'C:/Proyectos/nexus-garage-v2/HISTORIAL VEHICULOS.xlsb.xlsx';

async function main() {
  console.log('--- Iniciando Inspección de Excel ---');
  
  if (!fs.existsSync(filePath)) {
    console.error('Archivo no encontrado:', filePath);
    return;
  }

  const workbook = XLSX.readFile(filePath);
  console.log('Hojas encontradas:', workbook.SheetNames);

  const targetSheetName = "ENERO -FEBRERO-MARZO-ABRIL 2026";
  if (!workbook.SheetNames.includes(targetSheetName)) {
    console.warn(`¡Pestaña "${targetSheetName}" no encontrada!`);
    console.log('Buscando pestaña similar...');
    const similar = workbook.SheetNames.find(s => s.includes('2026'));
    if (similar) console.log(`Encontrada: "${similar}"`);
    return;
  }

  const sheet = workbook.Sheets[targetSheetName];
  // Convertir a JSON para inspeccionar estructura
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Primeras 5 filas del Excel:');
  console.log(JSON.stringify(data.slice(0, 5), null, 2));

  // Guardar una muestra para análisis
  fs.writeFileSync('C:/Proyectos/nexus-garage-v2/excel_sample.json', JSON.stringify(data.slice(0, 100), null, 2));
  console.log('Muestra guardada en excel_sample.json');
}

main().catch(console.error);
