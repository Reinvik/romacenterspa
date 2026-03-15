const fs = require('fs');
const { execSync } = require('child_process');

const supabaseUrl = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const supabaseKey = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';

async function verify() {
    try {
        const mapping = JSON.parse(fs.readFileSync('/tmp/mechanic_mapping_2026_v2.json', 'utf8'));
        const ticketIds = Object.keys(mapping).slice(0, 10); // Sample 10
        const idList = ticketIds.join(',');

        const response = execSync(`curl -s "${supabaseUrl}/rest/v1/garage_tickets?id=in.(${idList})&select=id,mechanic" ` +
                                 `-H "apikey: ${supabaseKey}" ` +
                                 `-H "Authorization: Bearer ${supabaseKey}"`).toString();
        
        const data = JSON.parse(response);
        console.log("Verification sample (Excel vs DB):");
        data.forEach(row => {
            console.log(`Ticket: ${row.id} | DB Mechanic: ${row.mechanic} | Excel: ${mapping[row.id]}`);
        });

        const mechanicsResp = execSync(`curl -s "${supabaseUrl}/rest/v1/mechanics?select=name" ` +
                                      `-H "apikey: ${supabaseKey}" ` +
                                      `-H "Authorization: Bearer ${supabaseKey}"`).toString();
        console.log("Registered Mechanics in DB:", mechanicsResp);
        
    } catch (e) {
        console.error("Verification failed:", e.message);
    }
}

verify();
