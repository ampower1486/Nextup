import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const EXTERNAL_URL = process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL;
const EXTERNAL_KEY = process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY;

const external = createClient(EXTERNAL_URL, EXTERNAL_KEY);

async function testSync() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const res = {
        code: code,
        restaurant_id: 'ba611d0e-a418-44b4-afb6-54288dd872ef', // Carmelitas Mexican Restaurant
        guest_name: 'Test Setup Link Sync',
        guest_email: 'testsync@example.com',
        guest_phone: '(555) 555-5555',
        date: '2026-03-05',
        time_slot: '7:00 PM',
        party_size: 4,
        status: 'confirmed',
        notes: 'Testing the Nextup Sync'
    };

    const { data, error } = await external.from('reservations').insert([res]).select('*');
    if (error) {
        console.error("Failed to insert:", error);
    } else {
        console.log("Inserted test reservation:", data);
    }
}

testSync();
