const fs = require('fs');
const { execSync } = require('child_process');

const mapping = JSON.parse(fs.readFileSync('/tmp/mechanic_mapping_refined.json', 'utf8'));
const currentTickets = JSON.parse(fs.readFileSync('/tmp/current_tickets_mechanics.json', 'utf8'));

const SUPABASE_URL = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const ANON_KEY = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';

const partNames = ['PLUMILLAS', 'ACEITE', 'FILTRO', 'POLEN', 'BUJIAS', 'AMPOLLETA', 'LIQUIDO', 'FRENOS', 'MANTENCION', 'CAMBIO', 'PRODUCTO', 'COSTO', 'TOTAL', 'VENTA', 'SALDO'];
const invalidValues = ['OTROS_1', 'PAGADO', 'COBRADO', 'PENDIENTE', 'MECANICO', 'TÉCNICO', 'TECNICO', 'ID'];

const updates = [];

currentTickets.forEach(ticket => {
    // Only update if mechanic is null or "Sin asignar"
    if (!ticket.mechanic || ticket.mechanic === 'Sin asignar') {
        const id = ticket.id.toUpperCase();
        let mech = mapping[id];
        
        if (mech) {
            // Further cleaning
            const isInvalid = invalidValues.includes(mech) || 
                              partNames.some(p => mech.includes(p)) || 
                              /^\d+/.test(mech) || 
                              mech.length < 3;
            
            if (!isInvalid) {
                updates.push({ id: ticket.id, mechanic: mech });
            }
        }
    }
});

console.log('--- FINAL UPDATES TO APPLY ---');
console.log('Total tickets to update:', updates.length);
console.log('Sample updates:', updates.slice(0, 10));

// Execution (Batching could be done, but individual is safer for small sets)
updates.forEach((u, index) => {
    if (index % 10 === 0) console.log(`Applying update ${index + 1}/${updates.length}...`);
    
    const cmd = `curl -X PATCH "${SUPABASE_URL}/rest/v1/garage_tickets?id=eq.${u.id}" -H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${ANON_KEY}" -H "Content-Type: application/json" -d "{\\\"mechanic\\\": \\\"${u.mechanic}\\\"}"`;
    try {
        execSync(cmd);
    } catch (e) {
        console.error(`Error updating ticket ${u.id}:`, e.message);
    }
});

console.log('Recovery complete!');
