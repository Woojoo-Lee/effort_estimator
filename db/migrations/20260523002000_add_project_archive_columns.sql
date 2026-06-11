-- Add archive/soft-delete columns for project lifecycle management.
--
-- Frontend deleteProjectById maps to the Tomcat API archive endpoint in API
-- backend mode. Supabase backend currently keeps the legacy hard delete
-- behavior. Tomcat API should set status = 'archived', archived_at = now(),
-- archived_by = actor_user_id, and write authoritative project.archive audit.
--
-- Physical foreign keys are intentionally not used. archived_by is a logical
-- reference to app_users.user_id or the API actor.

BEGIN;

DO $$
DECLARE
  project_table_exists boolean;
  status_column_exists boolean;
  updated_at_column_exists boolean;
  status_constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'estimation_projects'
  )
  INTO project_table_exists;

  IF NOT project_table_exists THEN
    RAISE NOTICE 'public.estimation_projects does not exist. Skipping project archive column migration.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'estimation_projects'
      AND column_name = 'status'
  )
  INTO status_column_exists;

  IF NOT status_column_exists THEN
    ALTER TABLE IF EXISTS public.estimation_projects
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'estimation_projects_status_chk'
        AND conrelid = 'public.estimation_projects'::regclass
    )
    INTO status_constraint_exists;

    IF NOT status_constraint_exists THEN
      ALTER TABLE public.estimation_projects
        ADD CONSTRAINT estimation_projects_status_chk
        CHECK (status IN ('active', 'archived'));
    END IF;
  ELSE
    RAISE NOTICE 'public.estimation_projects.status already exists. Skipping status column creation and check constraint addition.';
  END IF;

  ALTER TABLE IF EXISTS public.estimation_projects
    ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS archived_by uuid NULL,
    ADD COLUMN IF NOT EXISTS archive_reason text NULL;

  COMMENT ON COLUMN public.estimation_projects.status IS
    'Project lifecycle status. active and archived are used by the API archive flow.';
  COMMENT ON COLUMN public.estimation_projects.archived_at IS
    'Timestamp when the project was archived. Null means not archived.';
  COMMENT ON COLUMN public.estimation_projects.archived_by IS
    'Logical reference to app_users.user_id or API actor. Physical FK is intentionally not used.';
  COMMENT ON COLUMN public.estimation_projects.archive_reason IS
    'Optional reason captured by the API when archiving a project.';
  COMMENT ON TABLE public.estimation_projects IS
    'Project records. API archive flow uses status, archived_at, archived_by, and archive_reason; physical project FKs are intentionally not used.';

  EXECUTE 'CREATE INDEX IF NOT EXISTS estimation_projects_status_idx ON public.estimation_projects (status)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS estimation_projects_archived_at_idx ON public.estimation_projects (archived_at)';

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'estimation_projects'
      AND column_name = 'updated_at'
  )
  INTO updated_at_column_exists;

  IF updated_at_column_exists THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS estimation_projects_status_updated_idx ON public.estimation_projects (status, updated_at DESC)';
  ELSE
    RAISE NOTICE 'public.estimation_projects.updated_at does not exist. Skipping status/updated_at index.';
  END IF;
END $$;

COMMIT;
