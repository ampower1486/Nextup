import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY || '';

// Lazy initialization to avoid crashes if env vars are missing at startup
let cachedClient: any = null;

export const getExternalSupabase = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('External Supabase credentials missing');
        return null;
    }
    if (!cachedClient) {
        cachedClient = createClient(supabaseUrl, supabaseAnonKey);
    }
    return cachedClient;
};

// For backward compatibility while we refactor, but it might still crash if imported directly and used immediately.
// We recommend using getExternalSupabase() instead.
export const externalSupabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;
