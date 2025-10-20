-- Migration: Add project_prospects junction table
-- Purpose: Enable many-to-many relationship between projects and prospects
-- Author: Claude
-- Date: 2025-10-20

-- Create project_prospects junction table
CREATE TABLE IF NOT EXISTS project_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  prospect_id uuid NOT NULL,
  run_id text,
  added_at timestamptz DEFAULT now(),
  notes text,
  custom_score integer,
  status text DEFAULT 'active' CHECK (status IN ('active', 'contacted', 'qualified', 'disqualified', 'archived')),

  -- Foreign keys
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,

  -- Unique constraint to prevent duplicate prospect-project pairs
  CONSTRAINT uq_project_prospect UNIQUE (project_id, prospect_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_prospects_project ON project_prospects(project_id, status);
CREATE INDEX IF NOT EXISTS idx_project_prospects_prospect ON project_prospects(prospect_id);
CREATE INDEX IF NOT EXISTS idx_project_prospects_run_id ON project_prospects(run_id);

-- Add comment to table
COMMENT ON TABLE project_prospects IS 'Junction table linking prospects to projects (many-to-many relationship)';

-- Add comments to columns
COMMENT ON COLUMN project_prospects.project_id IS 'Reference to the project';
COMMENT ON COLUMN project_prospects.prospect_id IS 'Reference to the prospect';
COMMENT ON COLUMN project_prospects.run_id IS 'Prospecting run that added this prospect to this project';
COMMENT ON COLUMN project_prospects.notes IS 'Project-specific notes about this prospect';
COMMENT ON COLUMN project_prospects.custom_score IS 'Project-specific custom score (0-100)';
COMMENT ON COLUMN project_prospects.status IS 'Project-specific status for this prospect';
