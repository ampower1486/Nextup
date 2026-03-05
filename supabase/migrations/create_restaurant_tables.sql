-- =========================================================
-- CREATE RESTAURANT_TABLES TABLE for the Floor Plan Feature
-- =========================================================

-- Create the restaurant_tables table
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    uid UUID DEFAULT gen_random_uuid(),
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number TEXT NOT NULL,
    seats INTEGER NOT NULL DEFAULT 2,
    shape TEXT NOT NULL DEFAULT 'rectangle',
    status TEXT NOT NULL DEFAULT 'available',
    pos_x INTEGER NOT NULL DEFAULT 50,
    pos_y INTEGER NOT NULL DEFAULT 50,
    width INTEGER NOT NULL DEFAULT 100,
    height INTEGER NOT NULL DEFAULT 80,
    -- NOTE: Change UUID to TEXT if your "restaurants" table uses text/string IDs instead of UUIDs!
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    floor_plan_name TEXT DEFAULT 'Main',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================
-- SECURITY POLICIES (Row Level Security)
-- =========================================================

-- Enable Row Level Security
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public select (since public read is common in this app's components)
CREATE POLICY "Enable read access for all users" ON public.restaurant_tables FOR SELECT USING (true);

-- Create policy to allow inserts
CREATE POLICY "Enable insert access for all users" ON public.restaurant_tables FOR INSERT WITH CHECK (true);

-- Create policy to allow updates (status changes, dragging)
CREATE POLICY "Enable update access for all users" ON public.restaurant_tables FOR UPDATE USING (true);

-- Create policy to allow deletes
CREATE POLICY "Enable delete access for all users" ON public.restaurant_tables FOR DELETE USING (true);

-- =========================================================
-- SUPABASE REALTIME
-- =========================================================

-- Add the tracking to supabase_realtime so the Live Mode works perfectly
-- Check if publication exists before creating/adding
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;

-- =========================================================
-- NOTIFY CACHE
-- =========================================================
-- This is critical so the PostgREST server knows the table exists to avoid the "schema cache" error!
NOTIFY pgrst, 'reload schema';
