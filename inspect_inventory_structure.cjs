const XLSX = require('xlsx');

async function inspectExcel() {
  try {
    const workbook = XLSX.readFile('inventario.xlsx');
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('Headers:', data[0]);
    console.log('Sample Row 1:', data[1]);
    console.log('Sample Row 2:', data[2]);
    console.log('Sample Row 3:', data[3]);
  } catch (error) {
    console.error('Error reading excel:', error);
  }
}

inspectExcel();
