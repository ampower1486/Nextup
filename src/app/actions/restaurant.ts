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

export async function deleteRestaurantAction(id: string, externalId?: string | null) {
    const supabaseLocal = await createLocalClient();
    const supabaseExternal = createClient(EXTERNAL_URL, EXTERNAL_KEY);

    try {
        // 1. Delete from external Tablereserve if applicable
        if (externalId && externalId.trim() !== '') {
            const { error: extError } = await supabaseExternal
                .from('restaurants')
                .delete()
                .eq('id', externalId);
            if (extError) {
                console.error("Failed to delete external restaurant:", extError);
                // Non-blocking but warn
            }
        }

        // 2. Delete local mapping
        await supabaseLocal
            .from('external_mappings')
            .delete()
            .eq('local_restaurant_id', id);

        // 3. Unassign profiles from this restaurant
        await supabaseLocal.from('profiles').update({ restaurant_id: null }).eq('restaurant_id', id);

        // 4. Delete local restaurant
        const { error: localError } = await supabaseLocal
            .from('restaurants')
            .delete()
            .eq('id', id);

        if (localError) {
            return { success: false, error: localError.message };
        }

        revalidatePath('/');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || 'Unknown error during deletion' };
    }
}

export async function syncMissingRestaurantsAction() {
    const supabaseLocal = await createLocalClient();
    const supabaseExternal = createClient(EXTERNAL_URL, EXTERNAL_KEY);

    try {
        // 1. Fetch all external
        const { data: externalData, error: extError } = await supabaseExternal.from('restaurants').select('*');
        if (extError) throw new Error(`External Fetch Error: ${extError.message}`);

        // 2. Fetch all local
        const { data: localData, error: locError } = await supabaseLocal.from('restaurants').select('*');
        if (locError) throw new Error(`Local Fetch Error: ${locError.message}`);

        // 3. Find missing
        const externalIdsInLocal = new Set(localData?.map(r => r.tableserve_id).filter(Boolean));
        const missingRestaurants = externalData?.filter(r => !externalIdsInLocal.has(r.id)) || [];

        if (missingRestaurants.length === 0) {
            return { success: true, message: 'All restaurants are already synced.' };
        }

        // 4. Insert missing into local
        let syncedCount = 0;
        for (const ext of missingRestaurants) {
            const { data: newLocal, error: insertError } = await supabaseLocal
                .from('restaurants')
                .insert([{
                    name: ext.name,
                    slug: ext.slug + '-' + Math.random().toString(36).substring(2, 7), // Ensure unique slug
                    address: ext.address,
                    phone: ext.phone,
                    description: ext.description,
                    tableserve_id: ext.id
                }])
                .select()
                .single();

            if (!insertError && newLocal) {
                // Generate automated mapping
                await supabaseLocal.from('external_mappings').insert([{
                    local_restaurant_id: newLocal.id,
                    external_restaurant_id: ext.id,
                    external_restaurant_name: ext.name
                }]);
                syncedCount++;
            } else {
                console.error("Failed to insert missing restaurant:", ext.name, insertError);
            }
        }

        revalidatePath('/');
        return { success: true, message: `Successfully synced ${syncedCount} missing restaurants from Tablereserve.` };
    } catch (err: any) {
        return { success: false, error: err.message || 'Unknown error during sync' };
    }
}

export async function updateRestaurantAction(id: string, formData: {
    name: string;
    address?: string;
    phone?: string;
    description?: string;
    externalId?: string | null;
}) {
    const { name, address, phone, description, externalId } = formData;
    const supabaseLocal = await createLocalClient();
    const supabaseExternal = createClient(EXTERNAL_URL, EXTERNAL_KEY);

    try {
        // 1. Update local database
        const { error: localError } = await supabaseLocal
            .from('restaurants')
            .update({ name, address, phone, description })
            .eq('id', id);

        if (localError) throw new Error(`Local Update Error: ${localError.message}`);

        // Update mapping name just in case
        await supabaseLocal.from('external_mappings').update({ external_restaurant_name: name }).eq('local_restaurant_id', id);

        // 2. Update external database if linked
        let warning = undefined;
        if (externalId) {
            const { error: extError } = await supabaseExternal
                .from('restaurants')
                .update({ name, address, phone, description })
                .eq('id', externalId);

            if (extError) {
                console.error("Failed to update external restaurant:", extError);
                warning = `Restaurant updated locally, but failed to sync changes to Tablereserve: ${extError.message}`;
            }
        }

        revalidatePath('/');
        return { success: true, warning };
    } catch (err: any) {
        return { success: false, error: err.message || 'Unknown error during update' };
    }
}

export async function deleteExternalRestaurantAction(externalId: string) {
    const supabaseExternal = createClient(EXTERNAL_URL, EXTERNAL_KEY);
    try {
        const { error } = await supabaseExternal
            .from('restaurants')
            .delete()
            .eq('id', externalId);

        if (error) throw new Error(`External Delete Error: ${error.message}`);

        revalidatePath('/');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || 'Unknown error during external deletion' };
    }
}
