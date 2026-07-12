-- Add afternoon column to insulin_entries table
ALTER TABLE public.insulin_entries 
ADD COLUMN afternoon NUMERIC(5,2) DEFAULT 0 CHECK (afternoon >= 0 AND afternoon <= 200);
