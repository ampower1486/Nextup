-- SQL for Nightly Waitlist Cleanup at 11:59 PM
-- Run this in your Supabase SQL Editor

-- 1. Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create a function to clear the waitlist
-- We use a function so we can call it manually if needed
CREATE OR REPLACE FUNCTION public.nightly_waitlist_cleanup()
RETURNS void AS $$
BEGIN
  -- Delete all entries (Seated, No Show, and active Waiting)
  -- This clears the floor for the next day's operation
  DELETE FROM public.waitlist_entries;
END;
$$ LANGUAGE plpgsql;

-- 3. Schedule the task to run every night at 11:59 PM
-- syntax: cron.schedule('name', 'cron expression', 'command')
-- '59 23 * * *' = 11:59 PM every day
-- Note: This uses the database server time (usually UTC)
-- To match your local time, adjust the hour accordingly.
SELECT cron.schedule(
  'daily-reset-1159',
  '59 23 * * *',
  'SELECT public.nightly_waitlist_cleanup()'
);
