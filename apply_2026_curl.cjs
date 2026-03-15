const fs = require('fs');
const { execSync } = require('child_process');

const supabaseUrl = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const supabaseKey = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';

async function run() {
    try {
        const mapping = JSON.parse(fs.readFileSync('/tmp/mechanic_mapping_2026_v2.json', 'utf8'));
        const grouped = {};
        for (const [id, mech] of Object.entries(mapping)) {
            if (!grouped[mech]) grouped[mech] = [];
            grouped[mech].push(id);
        }

        for (const [mech, ids] of Object.entries(grouped)) {
            console.log(`Updating ${ids.length} tickets for mechanic: ${mech}`);
            const batchSize = 50;
            for (let i = 0; i < ids.length; i += batchSize) {
                const batch = ids.slice(i, i + batchSize);
                const idFilter = batch.join(',');
                
                const cmd = `curl -X PATCH "${supabaseUrl}/rest/v1/garage_tickets?id=in.(${idFilter})" ` +
                            `-H "apikey: ${supabaseKey}" ` +
                            `-H "Authorization: Bearer ${supabaseKey}" ` +
                            `-H "Content-Type: application/json" ` +
                            `-d "{\\\"mechanic\\\": \\\"${mech}\\\"}"`;
                
                execSync(cmd);
                console.log(`  Updated batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(ids.length/batchSize)} for ${mech}`);
            }
        }
        console.log("Bulk update completed successfully via curl.");
    } catch (error) {
        console.error("Error during bulk update:", error.message);
    }
}

run();
