import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const { action, ...payload } = await req.json();

        const supabaseUrl = process.env.EXTERNAL_SUPABASE_URL || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL;
        const supabaseKey = process.env.EXTERNAL_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'External Supabase configuration missing' }, { status: 500 });
        }

        const externalSupabase = createClient(supabaseUrl, supabaseKey);

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
