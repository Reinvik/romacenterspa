const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function generateUpdateSQL() {
  try {
    const excelPath = path.join(__dirname, 'inventario.xlsx');
    console.log(`Reading Excel from ${excelPath}...`);
    
    if (!fs.existsSync(excelPath)) {
      console.error('File not found!');
      return;
    }

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} rows in Excel.`);

    const companyId = 'e7f8c91b-d532-4540-8a46-891f2f30a1d6';
    let sqlStatements = [];
    
    data.forEach((row, index) => {
      const id = String(row['Código'] || '').trim();
      const name = String(row['Producto'] || '').trim().replace(/'/g, "''");
      
      // Clean stock (e.g., "6,00" -> 6)
      let stockRaw = String(row['Existencia'] || '0').replace(',', '.');
      const stock = Math.floor(parseFloat(stockRaw) || 0);
      
      // Clean price (e.g., "$4.500" -> 4500)
      let priceRaw = String(row['P. Venta'] || '0').replace(/[$.]/g, '').replace(',', '.');
      const price = parseFloat(priceRaw) || 0;
      
      // Clean min stock
      let minStockRaw = String(row['Inv. Mínimo'] || '0').replace(',', '.');
      const minStock = Math.floor(parseFloat(minStockRaw) || 0);
      
      const location = String(row['Departamento'] || '').trim().replace(/'/g, "''");

      if (id && id !== 'null' && id !== '') {
        sqlStatements.push(`('${id}', '${name}', ${stock}, ${minStock}, ${price}, '${companyId}', '${location}')`);
      }
    });

    if (sqlStatements.length === 0) {
      console.log('No valid rows to update.');
      return;
    }

    // Generate batch UPSERT
    const fullSQL = `
INSERT INTO client_romaspa.romaspa_parts (id, name, stock, min_stock, price, company_id, location)
VALUES 
${sqlStatements.join(',\n')}
ON CONFLICT (id) 
DO UPDATE SET 
  name = EXCLUDED.name,
  stock = EXCLUDED.stock,
  min_stock = EXCLUDED.min_stock,
  price = EXCLUDED.price,
  location = EXCLUDED.location,
  company_id = EXCLUDED.company_id;
`.trim();

    fs.writeFileSync('update_inventory.sql', fullSQL);
    console.log(`Successfully generated update_inventory.sql with ${sqlStatements.length} statements.`);
    console.log('You can now run this SQL using the Supabase MCP tool.');

  } catch (error) {
    console.error('Error processing Excel:', error);
  }
}

generateUpdateSQL();
