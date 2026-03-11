-- Client notes table for trainers to store notes about clients
CREATE TABLE IF NOT EXISTS ta_client_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES fc_clients(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL,
  author_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'injury', 'preference')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by client
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON ta_client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_studio_id ON ta_client_notes(studio_id);

-- RLS
ALTER TABLE ta_client_notes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (our API routes use service role)
CREATE POLICY "Service role full access on client notes"
  ON ta_client_notes
  FOR ALL
  USING (true)
  WITH CHECK (true);
