const axios = require('axios');

const supabaseUrl = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const supabaseKey = 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu';

const mechanics = [
    { name: 'ALEXANDER' },
    { name: 'FELIPE' },
    { name: 'DIEGO' }
];

async function run() {
    try {
        console.log("Registering mechanics...");
        const response = await axios.post(`${supabaseUrl}/rest/v1/mechanics`, mechanics, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        console.log("Mechanics registered successfully:", response.data);
    } catch (error) {
        console.error("Error registering mechanics:", error.response ? error.response.data : error.message);
    }
}

run();
