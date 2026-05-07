-- Push tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT,
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view own tokens" ON public.push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tokens" ON public.push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tokens" ON public.push_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tokens" ON public.push_tokens FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER trg_push_tokens_updated 
BEFORE UPDATE ON public.push_tokens 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
