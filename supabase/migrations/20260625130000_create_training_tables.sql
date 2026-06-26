-- Create training samples table
CREATE TABLE IF NOT EXISTS public.smart_scan_training_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  device_name TEXT,
  image_url TEXT NOT NULL,
  image_resolution JSONB NOT NULL, -- { width, height }
  display_bbox JSONB NOT NULL, -- { x, y, width, height } (0.0 to 1.0)
  reading_bboxes JSONB NOT NULL, -- { label: { x, y, w, h } }
  actual_values JSONB NOT NULL, -- { label: value }
  units JSONB, -- { label: unit }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ocr corrections feedback table
CREATE TABLE IF NOT EXISTS public.smart_scan_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_type TEXT NOT NULL,
  ocr_prediction TEXT NOT NULL,
  corrected_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smart_scan_training_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_scan_feedback ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies (Allow authenticated users to insert, read, and delete)
CREATE POLICY "Allow public read on training samples" ON public.smart_scan_training_samples 
  FOR SELECT USING (true);

CREATE POLICY "Allow auth insert on training samples" ON public.smart_scan_training_samples 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow auth delete on training samples" ON public.smart_scan_training_samples 
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow auth insert on feedback" ON public.smart_scan_feedback 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow auth read on feedback" ON public.smart_scan_feedback 
  FOR SELECT USING (auth.role() = 'authenticated');
