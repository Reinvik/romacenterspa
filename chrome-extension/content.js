chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getVehicleData") {
    let owner = "";
    let brand = "";
    let model = "";
    let patente = "";
    const año = "";

    // --- Estrategia 1: Leer directamente desde las celdas de la tabla ---
    // patentechile.com muestra los datos en una tabla con th/td o td+td
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('th, td');
            if (cells.length >= 2) {
                const label = cells[0].textContent.trim().toLowerCase();
                const value = cells[1].textContent.trim();

                // La celda "Patente" en la tabla tiene la patente real (AA1122, no la URL)
                if (label === 'patente' || label.includes('placa')) {
                    // Tomamos SIEMPRE el valor de la tabla, nunca la URL
                    patente = value.replace(/[^A-Z0-9]/ig, '').toUpperCase();
                }
                if (label.includes('nombre') || label.includes('propietario') || label.includes('titular')) {
                    owner = owner || value;
                }
                if (label === 'marca' || (label.includes('marca') && !label.includes('modelo'))) {
                    brand = brand || value;
                }
                if (label === 'modelo' || label.includes('modelo')) {
                    model = model || value;
                }
            }
        });
    });

    // --- Estrategia 2: dt/dd (alternativa a tablas) ---
    if (!owner || !brand) {
        const dts = document.querySelectorAll('dt');
        dts.forEach(dt => {
            const label = dt.textContent.trim().toLowerCase();
            const dd = dt.nextElementSibling;
            if (dd && dd.tagName === 'DD') {
                const value = dd.textContent.trim();
                if (label.includes('nombre') || label.includes('propietario') || label.includes('titular')) owner = owner || value;
                if (label === 'marca' || (label.includes('marca') && !label.includes('modelo'))) brand = brand || value;
                if (label === 'modelo' || label.includes('modelo')) model = model || value;
                if (label === 'patente' || label.includes('placa')) patente = patente || value.replace(/[^A-Z0-9]/ig, '').toUpperCase();
            }
        });
    }

    // --- Estrategia 3: Buscar patente en h1/h2 si la tabla no la dio ---
    // NOTA: Solo usamos URL como ÚLTIMO recurso, y validamos que sea una patente real
    // Una patente chilena tiene formato: 2 letras + 4 dígitos (AABB12) o 4 letras + 2 dígitos (AABB12)
    if (!patente) {
        const headings = document.querySelectorAll('h1, h2, h3');
        headings.forEach(h => {
            const match = h.textContent.match(/\b[A-Z]{2,4}[\s\-]?\d{2,4}\b/i);
            if (match) {
                patente = patente || match[0].replace(/[^A-Z0-9]/ig, '').toUpperCase();
            }
        });
    }

    // Último fallback: URL, pero solo si parece una patente (no "resultados", "buscar", etc.)
    if (!patente) {
        const urlParts = window.location.pathname.split('/').filter(Boolean);
        const candidate = urlParts[urlParts.length - 1];
        const isPatenteFormat = /^[A-Z]{2,4}\d{2,4}$/i.test(candidate);
        if (isPatenteFormat) {
            patente = candidate.toUpperCase();
        }
    }

    sendResponse({ owner, brand, model, patente });
  }
  return true; // Mantener canal abierto para respuesta asíncrona
});
