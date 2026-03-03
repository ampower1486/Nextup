'use server';

import { createClient as createLocalClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Hardcode completely to bypass any incorrect Vercel environment variables
const EXTERNAL_URL = 'https://nzkxcfchmsiaalpcixgq.supabase.co';
const EXTERNAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56a3hjZmNobXNpYWFscGNpeGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Nzc4NDYsImV4cCI6MjA4NzU1Mzg0Nn0.V49oMo3i0BFLgaEWMIqOah8gDvn4cC_b9hbJ2iExqGo';

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
    let tId = null;
    let externalErrorObj = null;

    try {
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
            externalErrorObj = externalError;
        } else {
            tId = externalData.id;
        }
    } catch (err: any) {
        console.error("External Sync Exception:", err);
        externalErrorObj = { message: err.message || 'Unknown error inserting to external DB' };
    }

    if (!tId) {
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
            warning: `Restaurant created locally, but failed to sync to Tablereserve: ${externalErrorObj?.message}`
        };
    }

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
        // If local fails after external succeeded, we should probably warn or delete external. 
        // For now, return the error.
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
