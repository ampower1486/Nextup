-- =========================================================
-- CREATE RESTAURANT_WALLS TABLE for the Floor Plan Feature
-- =========================================================

-- Create the restaurant_walls table
CREATE TABLE IF NOT EXISTS public.restaurant_walls (
    uid UUID DEFAULT gen_random_uuid(),
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_x INTEGER NOT NULL,
    start_y INTEGER NOT NULL,
    end_x INTEGER NOT NULL,
    end_y INTEGER NOT NULL,
    thickness INTEGER NOT NULL DEFAULT 8,
    color TEXT NOT NULL DEFAULT '#334155',
    -- Note: If your restaurants table uses TEXT IDs instead of UUIDs, change UUID below to TEXT
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    floor_plan_name TEXT DEFAULT 'Main',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================
-- SECURITY POLICIES (Row Level Security)
-- =========================================================
ALTER TABLE public.restaurant_walls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.restaurant_walls FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.restaurant_walls FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.restaurant_walls FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.restaurant_walls FOR DELETE USING (true);

-- =========================================================
-- SUPABASE REALTIME
-- =========================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_walls;

-- =========================================================
-- NOTIFY CACHE
-- =========================================================
NOTIFY pgrst, 'reload schema';
