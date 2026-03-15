const axios = require('axios');
const fs = require('fs');

const supabaseUrl = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const supabaseKey = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';

async function run() {
    try {
        const mapping = JSON.parse(fs.readFileSync('/tmp/mechanic_mapping_2026_v2.json', 'utf8'));
        const ticketIds = Object.keys(mapping);
        console.log(`Starting bulk update for ${ticketIds.length} tickets...`);

        // We can't do a single bulk update with different values easily via PostgREST without multiple calls 
        // or a complex RPC. For 743 items, doing them in batches or sequential is safer if no RPC is available.
        // However, PostgREST supports updating multiple rows with the same value.
        // Let's group by mechanic to minimize calls.
        
        const grouped = {};
        for (const [id, mech] of Object.entries(mapping)) {
            if (!grouped[mech]) grouped[mech] = [];
            grouped[mech].push(id);
        }

        for (const [mech, ids] of Object.entries(grouped)) {
            console.log(`Updating ${ids.length} tickets for mechanic: ${mech}`);
            
            // PostgREST update: PATCH /table?id=in.(id1,id2,...)
            // Batch ids to avoid URL length limits (approx 2000-4000 chars)
            const batchSize = 50;
            for (let i = 0; i < ids.length; i += batchSize) {
                const batch = ids.slice(i, i + batchSize);
                const idFilter = batch.join(',');
                
                await axios.patch(`${supabaseUrl}/rest/v1/garage_tickets?id=in.(${idFilter})`, 
                    { mechanic: mech },
                    {
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                console.log(`  Updated batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(ids.length/batchSize)} for ${mech}`);
            }
        }

        console.log("Bulk update completed successfully.");
    } catch (error) {
        console.error("Error during bulk update:", error.response ? error.response.data : error.message);
    }
}

run();
