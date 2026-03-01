'use server';

import { createClient as createLocalClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const EXTERNAL_URL = process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL!;
const EXTERNAL_KEY = process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY!;

export async function createRestaurantAction(formData: {
    name: string;
    address?: string;
    phone?: string;
    description?: string;
}) {
    const { name, address, phone, description } = formData;

    // 1. Create slug
    const slug = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '') + '-' + Math.random().toString(36).substring(2, 7);

    const supabaseLocal = await createLocalClient();
    const supabaseExternal = createClient(EXTERNAL_URL, EXTERNAL_KEY);

    // 2. Insert into External (Tablereserve) first to get the ID
    const { data: externalData, error: externalError } = await supabaseExternal
        .from('restaurants')
        .insert([{
            name,
            slug,
            address: address || null,
            phone: phone || null,
            description: description || null
        }])
        .select('id')
        .single();

    if (externalError) {
        console.error("External Sync Error:", externalError);
        // If external fails, we might still want to create local, but the user wants them synced.
        // Let's try to create local anyway but warn.
        const { data: localData, error: localError } = await supabaseLocal
            .from('restaurants')
            .insert([{ name, address, phone, description, slug }])
            .select()
            .single();

        return {
            success: !localError,
            data: localData,
            error: localError?.message,
            warning: `Restaurant created locally, but failed to sync to Tablereserve: ${externalError.message}`
        };
    }

    const tId = externalData.id;

    // 3. Insert into Local (Nextup) with the external ID as tableserve_id
    const { data: localData, error: localError } = await supabaseLocal
        .from('restaurants')
        .insert([{
            name,
            address,
            phone,
            description,
            slug,
            tableserve_id: tId
        }])
        .select()
        .single();

    if (localError) {
        return { success: false, error: `Local Error: ${localError.message}` };
    }

    // 4. Create Automated Mapping in Nextup
    if (localData?.id) {
        const { error: mappingError } = await supabaseLocal
            .from('external_mappings')
            .insert([{
                local_restaurant_id: localData.id,
                external_restaurant_id: tId,
                external_restaurant_name: name
            }]);

        if (mappingError) {
            console.error("Mapping Error:", mappingError);
            return {
                success: true,
                data: localData,
                warning: `Restaurant synced, but automated mapping failed: ${mappingError.message}`
            };
        }
    }

    revalidatePath('/');
    return { success: true, data: localData };
}
