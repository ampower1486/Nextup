import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const email = `test-${Date.now()}@example.com`;
    const password = `testPassword123!`;

    console.log(`Attempting signup with ${email}...`);
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                restaurant_name: 'Test Restaurant Signup'
            }
        }
    });

    if (error) {
        console.error("Signup Error Details:", JSON.stringify(error, null, 2));
    } else {
        console.log("Signup Success!", JSON.stringify(data, null, 2));
    }
}
check();
