
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Reading type enum
CREATE TYPE public.reading_type AS ENUM ('BB','AB','BL','AL','BD','AD','BT','Fasting');

-- Glucose entries
CREATE TABLE public.glucose_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  glucose NUMERIC(6,2) NOT NULL CHECK (glucose >= 0 AND glucose <= 1000),
  reading_type public.reading_type NOT NULL,
  food TEXT,
  notes TEXT,
  symptoms TEXT,
  date_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.glucose_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_glucose_user_date ON public.glucose_entries(user_id, date_time DESC);
CREATE POLICY "Users select own glucose" ON public.glucose_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own glucose" ON public.glucose_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own glucose" ON public.glucose_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own glucose" ON public.glucose_entries FOR DELETE USING (auth.uid() = user_id);

-- Insulin entries (one per day per user)
CREATE TABLE public.insulin_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  morning NUMERIC(5,2) DEFAULT 0 CHECK (morning >= 0 AND morning <= 200),
  lunch NUMERIC(5,2) DEFAULT 0 CHECK (lunch >= 0 AND lunch <= 200),
  evening NUMERIC(5,2) DEFAULT 0 CHECK (evening >= 0 AND evening <= 200),
  night NUMERIC(5,2) DEFAULT 0 CHECK (night >= 0 AND night <= 200),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);
ALTER TABLE public.insulin_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_insulin_user_date ON public.insulin_entries(user_id, entry_date DESC);
CREATE POLICY "Users select own insulin" ON public.insulin_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own insulin" ON public.insulin_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own insulin" ON public.insulin_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own insulin" ON public.insulin_entries FOR DELETE USING (auth.uid() = user_id);

-- Weight entries
CREATE TABLE public.weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_weight_user_date ON public.weight_entries(user_id, entry_date DESC);
CREATE POLICY "Users select own weight" ON public.weight_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own weight" ON public.weight_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own weight" ON public.weight_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own weight" ON public.weight_entries FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_glucose_updated BEFORE UPDATE ON public.glucose_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_insulin_updated BEFORE UPDATE ON public.insulin_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_weight_updated BEFORE UPDATE ON public.weight_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
