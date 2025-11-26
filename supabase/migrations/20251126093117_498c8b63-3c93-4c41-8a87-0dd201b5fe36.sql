-- Create ai_config table for storing OpenRouter API configuration
CREATE TABLE IF NOT EXISTS public.ai_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  api_key TEXT NOT NULL,
  model TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_config_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

-- Since this is configuration data that only backend functions access,
-- we don't need public policies. The functions use service role key.

-- Add comment
COMMENT ON TABLE public.ai_config IS 'Stores OpenRouter API configuration for AI features. Only accessible by backend functions.';
