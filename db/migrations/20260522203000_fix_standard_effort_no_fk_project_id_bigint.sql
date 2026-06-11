-- Correct standard effort metadata tables after the initial schema was applied.
-- Design update:
-- - Do not use physical foreign keys for standard effort tables.
-- - Keep PK, unique constraints, and indexes.
-- - Align standard effort project selection project_id with estimation_projects.id
--   by changing it from uuid to bigint when the selection tables are empty.

BEGIN;

ALTER TABLE IF EXISTS public.estimation_solution_variant
  DROP CONSTRAINT IF EXISTS estimation_solution_variant_solution_fk;

ALTER TABLE IF EXISTS public.estimation_standard_base_effort_meta
  DROP CONSTRAINT IF EXISTS estimation_standard_base_effort_variant_fk;

ALTER TABLE IF EXISTS public.estimation_item_solution_coefficient_meta
  DROP CONSTRAINT IF EXISTS estimation_item_solution_coefficient_item_fk;

ALTER TABLE IF EXISTS public.estimation_item_solution_coefficient_meta
  DROP CONSTRAINT IF EXISTS estimation_item_solution_coefficient_variant_fk;

ALTER TABLE IF EXISTS public.estimation_project_solution_selection
  DROP CONSTRAINT IF EXISTS estimation_project_solution_selection_variant_fk;

ALTER TABLE IF EXISTS public.estimation_project_item_solution_selection
  DROP CONSTRAINT IF EXISTS estimation_project_item_solution_selection_variant_fk;

ALTER TABLE IF EXISTS public.estimation_project_item_solution_selection
  DROP CONSTRAINT IF EXISTS estimation_project_item_solution_selection_item_fk;

DO $$
DECLARE
  solution_project_id_type text;
  item_project_id_type text;
  solution_selection_rows bigint;
  item_selection_rows bigint;
BEGIN
  SELECT data_type
    INTO solution_project_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'estimation_project_solution_selection'
    AND column_name = 'project_id';

  SELECT data_type
    INTO item_project_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'estimation_project_item_solution_selection'
    AND column_name = 'project_id';

  IF solution_project_id_type = 'uuid' THEN
    SELECT count(*)
      INTO solution_selection_rows
    FROM public.estimation_project_solution_selection;

    IF solution_selection_rows > 0 THEN
      RAISE EXCEPTION
        'Cannot change estimation_project_solution_selection.project_id from uuid to bigint while % rows exist. Migrate or clear selection data first.',
        solution_selection_rows;
    END IF;
  ELSIF solution_project_id_type IS DISTINCT FROM 'bigint' THEN
    RAISE EXCEPTION
      'Unexpected estimation_project_solution_selection.project_id type: %',
      solution_project_id_type;
  END IF;

  IF item_project_id_type = 'uuid' THEN
    SELECT count(*)
      INTO item_selection_rows
    FROM public.estimation_project_item_solution_selection;

    IF item_selection_rows > 0 THEN
      RAISE EXCEPTION
        'Cannot change estimation_project_item_solution_selection.project_id from uuid to bigint while % rows exist. Migrate or clear selection data first.',
        item_selection_rows;
    END IF;
  ELSIF item_project_id_type IS DISTINCT FROM 'bigint' THEN
    RAISE EXCEPTION
      'Unexpected estimation_project_item_solution_selection.project_id type: %',
      item_project_id_type;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.estimation_project_solution_selection
  DROP CONSTRAINT IF EXISTS estimation_project_solution_selection_pk;

ALTER TABLE IF EXISTS public.estimation_project_item_solution_selection
  DROP CONSTRAINT IF EXISTS estimation_project_item_solution_selection_pk;

DROP INDEX IF EXISTS public.estimation_project_solution_project_enabled_idx;
DROP INDEX IF EXISTS public.estimation_project_item_solution_project_variant_checked_idx;

DO $$
DECLARE
  solution_project_id_type text;
  item_project_id_type text;
BEGIN
  SELECT data_type
    INTO solution_project_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'estimation_project_solution_selection'
    AND column_name = 'project_id';

  IF solution_project_id_type = 'uuid' THEN
    ALTER TABLE public.estimation_project_solution_selection
      ALTER COLUMN project_id TYPE bigint USING NULL::bigint;
  END IF;

  SELECT data_type
    INTO item_project_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'estimation_project_item_solution_selection'
    AND column_name = 'project_id';

  IF item_project_id_type = 'uuid' THEN
    ALTER TABLE public.estimation_project_item_solution_selection
      ALTER COLUMN project_id TYPE bigint USING NULL::bigint;
  END IF;
END $$;

ALTER TABLE public.estimation_project_solution_selection
  ADD CONSTRAINT estimation_project_solution_selection_pk
  PRIMARY KEY (project_id, solution_variant_id);

ALTER TABLE public.estimation_project_item_solution_selection
  ADD CONSTRAINT estimation_project_item_solution_selection_pk
  PRIMARY KEY (project_id, solution_variant_id, item_id);

CREATE INDEX IF NOT EXISTS estimation_project_solution_project_enabled_idx
  ON public.estimation_project_solution_selection (project_id, enabled);

CREATE INDEX IF NOT EXISTS estimation_project_item_solution_project_variant_checked_idx
  ON public.estimation_project_item_solution_selection (
    project_id,
    solution_variant_id,
    checked
  );

COMMENT ON COLUMN public.estimation_project_solution_selection.project_id IS
  'References estimation_projects.id logically. Physical FK intentionally omitted; type is bigint.';

COMMENT ON COLUMN public.estimation_project_item_solution_selection.project_id IS
  'References estimation_projects.id logically. Physical FK intentionally omitted; type is bigint.';

COMMIT;
