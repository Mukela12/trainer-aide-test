-- Add is_archived column to fc_clients table
-- This allows studio owners to archive clients without deleting them

ALTER TABLE fc_clients
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Add index for filtering archived clients
CREATE INDEX IF NOT EXISTS idx_fc_clients_is_archived ON fc_clients(is_archived);

-- Comment
COMMENT ON COLUMN fc_clients.is_archived IS 'Whether the client is archived (hidden from active lists but not deleted)';
