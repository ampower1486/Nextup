import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    // Initialize Supabase with the Service Role Key to bypass RLS for server-to-server webhook inserts.
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const body = await request.json();
        const { restaurant_id, restaurant_user_id, restaurant_name, party_name, party_size, phone_number, notes } = body;

        const tsId = restaurant_id || restaurant_user_id;

        // Validate payload
        if (!tsId || !party_name || !party_size) {
            return NextResponse.json(
                { success: false, error: 'Missing required configuration: restaurant_id, party_name, and party_size are required.' },
                { status: 400 }
            );
        }

        // 1. Auto-Sync Restaurant: Ensure it exists in the restaurants table
        const { data: restaurant, error: fetchErr } = await supabaseAdmin
            .from('restaurants')
            .select('*')
            .eq('tableserve_id', tsId)
            .single();

        let finalUserId = null;

        if (fetchErr && fetchErr.code === 'PGRST116') {
            // Restaurant doesn't exist, create it (Auto-sync)
            await supabaseAdmin.from('restaurants').insert([{
                tableserve_id: tsId,
                name: restaurant_name || 'New TableServe Restaurant'
            }]);
        } else if (restaurant) {
            finalUserId = restaurant.linked_user_id;
            // Update name if it changed
            if (restaurant_name && restaurant.name !== restaurant_name) {
                await supabaseAdmin.from('restaurants').update({ name: restaurant_name }).eq('tableserve_id', tsId);
            }
        }

        // 2. Insert the incoming reservation
        // Even if finalUserId is null (unassigned), we insert it so Admin can see it. 
        // We might want a default or null user_id for unassigned entries.
        // For now, if unassigned, we'll store it but it won't appear for any specific restaurant users.
        const { data, error } = await supabaseAdmin.from('waitlist_entries').insert([{
            user_id: finalUserId, // This will be null if unassigned
            party_name,
            party_size: parseInt(party_size, 10),
            phone_number: phone_number || null,
            notes: notes ? `${notes} (Synced from TableServe)` : 'Synced from TableServe',
            quoted_time: 0,
            status: 'Waiting',
            is_tableserve: true,
            restaurant_id: tsId // We should probably add this to waitlist_entries too for easier tracking
        }]).select();

        if (error) {
            console.error('TableServe Webhook Insert Error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: finalUserId ? 'Reservation routed.' : 'Reservation received (Unassigned).', data }, { status: 201 });

    } catch (err: any) {
        console.error('TableServe Webhook Processing Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
