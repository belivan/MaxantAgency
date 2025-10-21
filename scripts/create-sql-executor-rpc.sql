-- Create RPC function to execute raw SQL
-- This function allows executing SQL statements via Supabase RPC

CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

-- Comment
COMMENT ON FUNCTION exec_sql IS 'Executes raw SQL statements - use with caution!';
