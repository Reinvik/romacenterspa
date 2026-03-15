import XLSX from 'xlsx';

const filePath = 'C:/Proyectos/nexus-garage-v2/HISTORIAL VEHICULOS.xlsb.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Hojas disponibles:', workbook.SheetNames);
} catch (error) {
  console.error('Error al leer el archivo:', error);
}
