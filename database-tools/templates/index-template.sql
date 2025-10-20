-- Index Templates
-- Common index patterns for database optimization

-- Single Column Index
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column_name);

-- Composite Index (multiple columns)
CREATE INDEX IF NOT EXISTS idx_table_col1_col2 ON table_name(column1, column2);

-- Unique Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_table_unique_column ON table_name(column_name);

-- Partial Index (filtered)
CREATE INDEX IF NOT EXISTS idx_table_active_only
  ON table_name(column_name)
  WHERE status = 'active';

-- Index on JSONB field
CREATE INDEX IF NOT EXISTS idx_table_jsonb_field
  ON table_name USING GIN (jsonb_column);

-- Text Search Index
CREATE INDEX IF NOT EXISTS idx_table_fulltext
  ON table_name USING GIN (to_tsvector('english', text_column));

-- Index for Foreign Keys (IMPORTANT!)
-- Always create indexes on foreign key columns for performance
CREATE INDEX IF NOT EXISTS idx_table_foreign_key ON table_name(foreign_key_column);
