require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data: locals } = await supabase.from('restaurants').select('id, name').limit(1);
    if (!locals || !locals.length) return console.log("No local rest");
    const localId = locals[0].id;

    console.log("Testing insert with empty UUID string...");
    const res2 = await supabase.from('external_mappings').insert([{
        local_restaurant_id: localId,
        external_restaurant_id: ''
    }]);
    console.log(res2.error || "Success 2");
}
test();
