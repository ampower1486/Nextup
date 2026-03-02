import { createClient } from '@supabase/supabase-js';
const FALLBACK_URL = 'https://nzkxcfchmsiaalpcixgq.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56a3hjZmNobXNpYWFscGNpeGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Nzc4NDYsImV4cCI6MjA4NzU1Mzg0Nn0.V49oMo3i0BFLgaEWMIqOah8gDvn4cC_b9hbJ2iExqGo';
const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function check() {
    const { data: res, error: e1 } = await supabase.from('restaurants').select('*');
    console.log("restaurants:", JSON.stringify(res, null, 2));
}
check();
