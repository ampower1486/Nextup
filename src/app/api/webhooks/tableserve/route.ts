import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with the Service Role Key to bypass RLS for server-to-server webhook inserts.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { restaurant_user_id, party_name, party_size, phone_number, notes } = body;

        // Validate payload
        if (!restaurant_user_id || !party_name || !party_size) {
            return NextResponse.json(
                { success: false, error: 'Missing required configuration: restaurant_user_id, party_name, and party_size are required.' },
                { status: 400 }
            );
        }

        // Insert the incoming reservation directly into the Nextup Waitlist
        const { data, error } = await supabaseAdmin.from('waitlist_entries').insert([{
            user_id: restaurant_user_id,
            party_name,
            party_size: parseInt(party_size, 10),
            phone_number: phone_number || null,
            notes: notes || 'Synced from TableServe',
            quoted_time: 0,
            status: 'Waiting',
            is_tableserve: true
        }]).select();

        if (error) {
            console.error('TableServe Webhook Insert Error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data }, { status: 201 });

    } catch (err: any) {
        console.error('TableServe Webhook Processing Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
