const https = require('https');

const data = JSON.stringify([
    { name: 'ALEXANDER' },
    { name: 'FELIPE' },
    { name: 'DIEGO' }
]);

const options = {
    hostname: 'qtzpzgwyjptbnipvyjdu.supabase.co',
    path: '/rest/v1/mechanics',
    method: 'POST',
    headers: {
        'apikey': 'sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu',
        'Authorization': 'Bearer sb_publishable_Gu-Ms46DKjORMc5KY-lamA_TwbnIalu',
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body);
    });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
