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

        // 1. Resolve Local Restaurant via Mappings first
        const { data: mapping } = await supabaseAdmin
            .from('external_mappings')
            .select('local_restaurant_id')
            .eq('external_restaurant_id', tsId)
            .single();

        let finalLocalId = mapping?.local_restaurant_id;
        let finalUserId = null;

        // 2. Fallback to direct tableserve_id on restaurants table if no mapping found
        if (!finalLocalId) {
            const { data: restaurant } = await supabaseAdmin
                .from('restaurants')
                .select('id, linked_user_id')
                .eq('tableserve_id', tsId)
                .single();

            if (restaurant) {
                finalLocalId = restaurant.id;
                finalUserId = restaurant.linked_user_id;
            }
        } else {
            // Mapping found, get the linked user for this restaurant
            const { data: restaurant } = await supabaseAdmin
                .from('restaurants')
                .select('linked_user_id')
                .eq('id', finalLocalId)
                .single();
            if (restaurant) finalUserId = restaurant.linked_user_id;
        }

        // 3. Auto-Sync/Create if still not found
        if (!finalLocalId) {
            // Restaurant doesn't exist, create it (Auto-sync)
            const slug = (restaurant_name || 'New TableServe Restaurant')
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '') + '-' + Math.random().toString(36).substring(2, 7);

            const { data: newRest, error: createError } = await supabaseAdmin.from('restaurants').insert([{
                tableserve_id: tsId,
                name: restaurant_name || 'New TableServe Restaurant',
                slug
            }]).select().single();

            if (!createError && newRest) {
                finalLocalId = newRest.id;
                finalUserId = null;
                // Also create mapping so it shows in polling
                await supabaseAdmin.from('external_mappings').insert([{
                    local_restaurant_id: newRest.id,
                    external_restaurant_id: tsId,
                    external_restaurant_name: restaurant_name || 'New TableServe Restaurant'
                }]);
            }
        }

        // 2. Insert the incoming reservation
        const { data, error } = await supabaseAdmin.from('waitlist_entries').insert([{
            user_id: finalUserId,
            party_name,
            party_size: parseInt(party_size, 10),
            phone_number: phone_number || null,
            notes: notes ? `${notes} (Synced from TableServe)` : 'Synced from TableServe',
            quoted_time: 0,
            status: 'Waiting',
            is_tableserve: true,
            restaurant_id: finalLocalId
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
