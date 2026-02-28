import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXTERNAL_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXTERNAL_SUPABASE_ANON_KEY || '';

export const externalSupabase = createClient(supabaseUrl, supabaseAnonKey);
