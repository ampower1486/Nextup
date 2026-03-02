import { createClient } from '@supabase/supabase-js';

// Constant credentials for Tablereserve project (Project ID: nzkxcfchmsiaalpcixgq)
const FALLBACK_URL = 'https://nzkxcfchmsiaalpcixgq.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56a3hjZmNobXNpYWFscGNpeGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Nzc4NDYsImV4cCI6MjA4NzU1Mzg0Nn0.V49oMo3i0BFLgaEWMIqOah8gDvn4cC_b9hbJ2iExqGo'; // Full valid JWT for fallback

const supabaseUrl = FALLBACK_URL;
const supabaseAnonKey = FALLBACK_KEY;

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
