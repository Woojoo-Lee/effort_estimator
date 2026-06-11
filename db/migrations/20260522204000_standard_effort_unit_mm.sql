-- Rename standard effort unit columns from *_md to *_mm.
-- Values are already treated as M/M and are not converted.
-- Physical foreign keys remain intentionally absent.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'estimation_standard_base_effort_meta'
      AND column_name = 'effort_md'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'estimation_standard_base_effort_meta'
      AND column_name = 'effort_mm'
  ) THEN
    ALTER TABLE public.estimation_standard_base_effort_meta
      RENAME COLUMN effort_md TO effort_mm;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'estimation_project_solution_selection'
      AND column_name = 'actual_effort_md'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'estimation_project_solution_selection'
      AND column_name = 'actual_effort_mm'
  ) THEN
    ALTER TABLE public.estimation_project_solution_selection
      RENAME COLUMN actual_effort_md TO actual_effort_mm;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'estimation_project_solution_selection'
      AND column_name = 'actual_effort'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'estimation_project_solution_selection'
      AND column_name = 'actual_effort_mm'
  ) THEN
    ALTER TABLE public.estimation_project_solution_selection
      RENAME COLUMN actual_effort TO actual_effort_mm;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'estimation_standard_base_effort_meta'
      AND column_name = 'effort_mm'
  ) THEN
    COMMENT ON COLUMN public.estimation_standard_base_effort_meta.effort_mm IS
      'Base effort in M/M. Values are loaded from the Excel standard effort sheet without unit conversion.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'estimation_project_solution_selection'
      AND column_name = 'actual_effort_mm'
  ) THEN
    COMMENT ON COLUMN public.estimation_project_solution_selection.actual_effort_mm IS
      'Actual effort in M/M. No M/D to M/M conversion is applied.';
  END IF;
END $$;

COMMIT;
