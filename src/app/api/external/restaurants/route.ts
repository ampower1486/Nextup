import { NextResponse } from 'next/server';
import { getExternalSupabase } from '@/lib/external_supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const externalSupabase = getExternalSupabase();

        if (!externalSupabase) {
            return NextResponse.json({ error: 'External Supabase client initialization failed' }, { status: 500 });
        }

        const { data, error } = await externalSupabase.from('restaurants').select('id, name').order('name');

        if (error) throw error;

        return NextResponse.json({ restaurants: data || [] });
    } catch (error: any) {
        console.error('API External Restaurants Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

