-- Trigger function to check and prevent future dates
CREATE OR REPLACE FUNCTION public.check_future_date_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate glucose_entries (TIMESTAMPTZ field: date_time)
  IF TG_TABLE_NAME = 'glucose_entries' THEN
    -- Allow a small clock skew tolerance of 5 minutes
    IF NEW.date_time > now() + interval '5 minutes' THEN
      RAISE EXCEPTION 'Future dates are not allowed for glucose readings.'
        USING ERRCODE = '23501'; -- Custom validation error code
    END IF;
  END IF;

  -- Validate insulin_entries (DATE field: entry_date)
  IF TG_TABLE_NAME = 'insulin_entries' THEN
    -- Compare entry_date against the current date in UTC + 1 day to allow all valid global timezones
    IF NEW.entry_date > (CURRENT_DATE + 1) THEN
      RAISE EXCEPTION 'Future dates are not allowed for insulin entries.'
        USING ERRCODE = '23501';
    END IF;
  END IF;

  -- Validate weight_entries (DATE field: entry_date)
  IF TG_TABLE_NAME = 'weight_entries' THEN
    -- Compare entry_date against the current date in UTC + 1 day to allow all valid global timezones
    IF NEW.entry_date > (CURRENT_DATE + 1) THEN
      RAISE EXCEPTION 'Future dates are not allowed for weight entries.'
        USING ERRCODE = '23501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for glucose_entries
DROP TRIGGER IF EXISTS trg_glucose_check_future ON public.glucose_entries;
CREATE TRIGGER trg_glucose_check_future
  BEFORE INSERT OR UPDATE ON public.glucose_entries
  FOR EACH ROW EXECUTE FUNCTION public.check_future_date_trigger();

-- Triggers for insulin_entries
DROP TRIGGER IF EXISTS trg_insulin_check_future ON public.insulin_entries;
CREATE TRIGGER trg_insulin_check_future
  BEFORE INSERT OR UPDATE ON public.insulin_entries
  FOR EACH ROW EXECUTE FUNCTION public.check_future_date_trigger();

-- Triggers for weight_entries
DROP TRIGGER IF EXISTS trg_weight_check_future ON public.weight_entries;
CREATE TRIGGER trg_weight_check_future
  BEFORE INSERT OR UPDATE ON public.weight_entries
  FOR EACH ROW EXECUTE FUNCTION public.check_future_date_trigger();
