const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testInsert() {
    const nextupEnv = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
    let nextupUrl, nextupKey;
    nextupEnv.split('\n').forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) nextupUrl = line.split('=')[1].trim();
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) nextupKey = line.split('=')[1].trim();
    });

    const supabaseLocal = createClient(nextupUrl, nextupKey);

    const { data: localData, error } = await supabaseLocal.from('restaurants').insert([{
        name: 'Test Setup Nextup',
        slug: 'test-slug'
    }]).select();

    console.log("Error?", error);
    console.log("Data:", localData);

    if (localData) {
        await supabaseLocal.from('restaurants').delete().eq('id', localData[0].id);
    }
}
testInsert();
