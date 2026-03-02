import { NextResponse } from 'next/server';
import { getExternalSupabase } from '@/lib/external_supabase';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const externalRestId = searchParams.get('restaurant_id');

        if (!externalRestId) {
            return NextResponse.json({ error: 'Missing restaurant_id' }, { status: 400 });
        }

        const externalSupabase = getExternalSupabase();

        if (!externalSupabase) {
            return NextResponse.json({ error: 'External Supabase configuration missing' }, { status: 500 });
        }

        const { data, error } = await externalSupabase
            .from('reservations')
            .select('*')
            .eq('restaurant_id', externalRestId)
            .eq('status', 'confirmed')
            .order('date', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ reservations: data || [] });
    } catch (error: any) {
        console.error('API Tableserve Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
