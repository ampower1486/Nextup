import { NextResponse } from 'next/server';
import { getExternalSupabase } from '@/lib/external_supabase';

export async function POST(req: Request) {
    try {
        const { action, ...payload } = await req.json();

        const externalSupabase = getExternalSupabase();

        if (!externalSupabase) {
            return NextResponse.json({ error: 'External Supabase client initialization failed' }, { status: 500 });
        }

        if (action === 'update-status') {
            const { resId, status } = payload;
            const { error } = await externalSupabase
                .from('reservations')
                .update({ status })
                .eq('id', resId);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (action === 'toggle-share') {
            const { resId, isShared } = payload;
            const { error } = await externalSupabase
                .from('reservations')
                .update({ is_shared: isShared })
                .eq('id', resId);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('API External Proxy POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
