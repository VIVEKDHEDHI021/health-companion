-- Create smart_scan_readings table
CREATE TABLE public.smart_scan_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL, -- e.g. 'Blood Glucose Meter', 'Blood Pressure Monitor', 'Pulse Oximeter', 'Thermometer', 'Weight Scale'
  reading_date DATE NOT NULL,
  reading_time TIME NOT NULL,
  confidence NUMERIC(4,2) NOT NULL,
  ocr_source TEXT NOT NULL,
  image_url TEXT,
  notes TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced', -- 'synced' | 'pending'
  data JSONB NOT NULL, -- Holds reading-specific fields (systolic, diastolic, pulse, glucose, spo2, temperature, weight, unit)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smart_scan_readings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users select own scans" ON public.smart_scan_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own scans" ON public.smart_scan_readings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own scans" ON public.smart_scan_readings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own scans" ON public.smart_scan_readings FOR DELETE USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_smart_scan_user_date ON public.smart_scan_readings(user_id, reading_date DESC);

-- Trigger for updated_at
CREATE TRIGGER trg_smart_scan_updated
  BEFORE UPDATE ON public.smart_scan_readings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
