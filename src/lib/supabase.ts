import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type WaitlistStatus = 'Waiting' | 'Notified' | 'Seated' | 'No Show';

export interface WaitlistEntry {
    id: string;
    party_name: string;
    party_size: number;
    quoted_time: number;
    created_at: string;
    updated_at?: string;
    notes?: string;
    status: WaitlistStatus;
    phone_number?: string;
    is_tableserve: boolean;
}
