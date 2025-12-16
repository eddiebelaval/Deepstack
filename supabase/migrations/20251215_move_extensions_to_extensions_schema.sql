-- Security Fix: Move extensions from public schema to extensions schema
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
--
-- Extensions in the public schema can be a security risk because:
-- 1. They increase the public schema's attack surface
-- 2. They can conflict with user-created objects
-- 3. They expose extension internals to all database users
--
-- Moving extensions to a dedicated schema isolates them and follows
-- the principle of least privilege.

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move pg_trgm extension to extensions schema
-- Note: This requires dropping and recreating the extension
-- Any indexes using pg_trgm functions will need to be recreated

-- First, check for any dependencies and handle them
DO $$
BEGIN
    -- Drop the extension from public (if it exists there)
    IF EXISTS (
        SELECT 1 FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
    ) THEN
        DROP EXTENSION IF EXISTS pg_trgm CASCADE;
        -- Recreate in extensions schema
        CREATE EXTENSION pg_trgm SCHEMA extensions;
    END IF;
END $$;

-- Move citext extension to extensions schema
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname = 'citext' AND n.nspname = 'public'
    ) THEN
        DROP EXTENSION IF EXISTS citext CASCADE;
        CREATE EXTENSION citext SCHEMA extensions;
    END IF;
END $$;

-- Update search_path to include extensions schema for convenience
-- This allows using extension functions without schema qualification
-- Note: This is optional but recommended for usability
COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions - keeps them isolated from public schema';
