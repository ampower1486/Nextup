import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        const supabaseUrl = process.env.EXTERNAL_SUPABASE_URL || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL;
        const supabaseKey = process.env.EXTERNAL_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'External Supabase configuration missing' }, { status: 500 });
        }

        const externalSupabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await externalSupabase.from('restaurants').select('id, name').order('name');

        if (error) throw error;

        return NextResponse.json({ restaurants: data || [] });
    } catch (error: any) {
        console.error('API External Restaurants Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
