import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking Nextup DB...");
    const { data: mappings, error: e1 } = await supabase.from('external_mappings').select('*');
    console.log("external_mappings:", JSON.stringify(mappings, null, 2), e1);

    const { data: restos, error: e3 } = await supabase.from('restaurants').select('*');
    console.log("\nrestaurants:", JSON.stringify(restos, null, 2), e3);
}
check();
