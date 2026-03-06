require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function signUp() {
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
        console.error("Signup Error:", error);
    } else {
        console.log("Signup Success!", data);
    }
}

signUp();
