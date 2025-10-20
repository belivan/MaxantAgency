-- Setup: Create exec_sql Function for Database Tools
-- This function is required by database-tools to execute raw SQL statements
-- It must be created once in Supabase before running migrations

CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify function was created
SELECT proname, proargtypes, prosrc
FROM pg_proc
WHERE proname = 'exec_sql';
