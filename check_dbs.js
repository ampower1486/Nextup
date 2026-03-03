const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkDbs() {
    // 1. Get Local Nextup Restaurants
    const nextupEnv = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
    let nextupUrl, nextupKey;
    nextupEnv.split('\n').forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) nextupUrl = line.split('=')[1].trim();
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) nextupKey = line.split('=')[1].trim();
    });

    const supabaseLocal = createClient(nextupUrl, nextupKey);

    // 2. Get External Tablereserve Restaurants
    const EXTERNAL_URL = 'https://nzkxcfchmsiaalpcixgq.supabase.co';
    const EXTERNAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56a3hjZmNobXNpYWFscGNpeGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Nzc4NDYsImV4cCI6MjA4NzU1Mzg0Nn0.V49oMo3i0BFLgaEWMIqOah8gDvn4cC_b9hbJ2iExqGo';
    const supabaseExternal = createClient(EXTERNAL_URL, EXTERNAL_KEY);

    try {
        const { data: localData, error: e1 } = await supabaseLocal.from('restaurants').select('*');
        if (e1) throw e1;

        const { data: externalData, error: e2 } = await supabaseExternal.from('restaurants').select('*');
        if (e2) throw e2;

        const { data: mappings, error: e3 } = await supabaseLocal.from('external_mappings').select('*');
        if (e3) throw e3;

        console.log("Local Nextup Restaurants:", localData?.length);
        console.log("External Tablereserve Restaurants:", externalData?.length);
        console.log("Mappings:", mappings?.length);

        console.log("\n--- Local Restaurants ---");
        localData?.forEach(r => console.log(`[Nextup] ${r.name} (${r.id}) - Tableserve_id: ${r.tableserve_id}`));

        console.log("\n--- External Restaurants ---");
        externalData?.forEach(r => console.log(`[Tablereserve] ${r.name} (${r.id})`));

        // Let's also do a dry run of what needs syncing
        const externalIds = new Set(externalData?.map(r => r.id));
        const missingInExternal = localData?.filter(r => !r.tableserve_id || !externalIds.has(r.tableserve_id));
        if (missingInExternal?.length > 0) {
            console.log("\nRestaurants in Nextup missing from Tablereserve:", missingInExternal.map(r => r.name));
            process.exit(1);
        } else {
            console.log("\nAll Nextup restaurants exist in Tablereserve!");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}
checkDbs();
