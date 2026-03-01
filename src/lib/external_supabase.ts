import { createClient } from '@supabase/supabase-js';

// Constant credentials for Tablereserve project (Project ID: nzkxcfchmsiaalpcixgq)
const FALLBACK_URL = 'https://nzkxcfchmsiaalpcixgq.supabase.co';
const FALLBACK_KEY = 'V49oMo3i0BFLgaEWMIqOah8gDvn4cC_b9hbJ2iExqGo'; // Extracted anon key from successful fetches

const supabaseUrl = process.env.EXTERNAL_SUPABASE_URL || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = process.env.EXTERNAL_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY || FALLBACK_KEY;

// Lazy initialization to avoid crashes if env vars are missing at startup
let cachedClient: any = null;

export const getExternalSupabase = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('External Supabase credentials missing and no fallback available');
        return null;
    }
    if (!cachedClient) {
        try {
            cachedClient = createClient(supabaseUrl, supabaseAnonKey);
        } catch (e) {
            console.error('Failed to initialize external Supabase client:', e);
            return null;
        }
    }
    return cachedClient;
};

// For backward compatibility while we refactor
export const externalSupabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;
