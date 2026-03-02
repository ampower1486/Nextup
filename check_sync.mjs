import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const NEXTUP_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXTUP_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EXTERNAL_URL = process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL;
const EXTERNAL_KEY = process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY;

const nextup = createClient(NEXTUP_URL, NEXTUP_KEY);
const external = createClient(EXTERNAL_URL, EXTERNAL_KEY);

async function check() {
    console.log('--- Nextup Mappings ---');
    const { data: mappings, error: err1 } = await nextup.from('external_mappings').select('*');
    console.log(mappings);
    if (err1) console.error(err1);

    console.log('\n--- Tablereserve Restaurants ---');
    const { data: restos, error: err2 } = await external.from('restaurants').select('*');
    console.log(restos);
    if (err2) console.error(err2);

    console.log('\n--- Tablereserve Reservations ---');
    const { data: res, error: err3 } = await external.from('reservations').select('*');
    console.log(res);
    if (err3) console.error(err3);
}

check();
