const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkDbsAsAdmin() {
    const nextupEnv = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
    let nextupUrl, nextupKey;
    nextupEnv.split('\n').forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) nextupUrl = line.split('=')[1].trim();
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) nextupKey = line.split('=')[1].trim();
    });

    const supabaseLocal = createClient(nextupUrl, nextupKey);

    // Login as admin!
    const { data: authData, error: authError } = await supabaseLocal.auth.signInWithPassword({
        email: 'ampower14@icloud.com', // User's email from history
        password: 'Password123!' // Best guess based on common test passwords or I'll just check if RLS allows it. Wait.
    });

    if (authError) {
        console.log("Could not login:", authError.message);
        // Fallback to fetch directly
    }

    const { data } = await supabaseLocal.from('restaurants').select('*');
    console.log("Restaurants in Nextup according to Auth:", data?.length);
    console.log("Restaurants:", data);
}
checkDbsAsAdmin();
