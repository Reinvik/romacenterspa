const fetch = require('node-fetch');

async function testEdgeFunction() {
    const url = 'https://qtzpzgwyjptbnipvyjdu.supabase.co/functions/v1/manage-users';
    const payload = {
        action: 'create_user',
        userData: {
            email: 'test_error_debug@example.com',
            password: 'securePassword123!',
            full_name: 'Test Debugger',
            company_id: '12345678-1234-1234-1234-123456789012' // Fake or use a real company UUID
        }
    };

    console.log("Sending request to Edge Function...");
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Normally requires auth if enforce JWT is on, but maybe it isn't?
                // Wait, if it enforces JWT, we need an apikey/auth.
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Response:", text);
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

testEdgeFunction();
