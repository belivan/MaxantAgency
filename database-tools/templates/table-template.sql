-- Table Template
-- Copy this template to create new tables manually

CREATE TABLE IF NOT EXISTS table_name (
  -- Primary Key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Required Fields
  name text NOT NULL,

  -- Optional Fields
  description text,

  -- Status/State (with CHECK constraint)
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),

  -- JSON Data
  metadata jsonb,

  -- Foreign Keys
  -- parent_id uuid REFERENCES parent_table(id) ON DELETE CASCADE,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_table_name_status ON table_name(status);
CREATE INDEX IF NOT EXISTS idx_table_name_created_at ON table_name(created_at);

-- Foreign Key Constraints (if not defined inline above)
-- ALTER TABLE table_name
--   ADD CONSTRAINT fk_table_name_parent
--   FOREIGN KEY (parent_id)
--   REFERENCES parent_table(id)
--   ON DELETE CASCADE
--   ON UPDATE CASCADE;

-- Comments
COMMENT ON TABLE table_name IS 'Description of what this table stores';
COMMENT ON COLUMN table_name.id IS 'Primary key';
COMMENT ON COLUMN table_name.status IS 'Current status of the record';
