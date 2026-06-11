-- Additive schema for the 2026 Excel standard-effort calculation model.
-- This migration intentionally avoids Supabase-only features such as RLS,
-- Auth policies, Realtime, or Storage dependencies.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.estimation_solution (
  solution_code text PRIMARY KEY,
  solution_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL
);

CREATE TABLE IF NOT EXISTS public.estimation_solution_variant (
  solution_variant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_code text NOT NULL,
  variant_code text NOT NULL,
  variant_name text NOT NULL,
  display_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT estimation_solution_variant_solution_fk
    FOREIGN KEY (solution_code)
    REFERENCES public.estimation_solution(solution_code),
  CONSTRAINT estimation_solution_variant_solution_variant_uq
    UNIQUE (solution_code, variant_code)
);

CREATE TABLE IF NOT EXISTS public.estimation_standard_base_effort_meta (
  base_effort_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_variant_id uuid NOT NULL,
  phase_code text NOT NULL,
  phase_name text NOT NULL,
  effort_md numeric(12, 4) NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT estimation_standard_base_effort_variant_fk
    FOREIGN KEY (solution_variant_id)
    REFERENCES public.estimation_solution_variant(solution_variant_id),
  CONSTRAINT estimation_standard_base_effort_variant_phase_uq
    UNIQUE (solution_variant_id, phase_code)
);

CREATE TABLE IF NOT EXISTS public.estimation_standard_item_meta (
  item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excel_row_no integer NULL,
  category_l1 text NOT NULL,
  category_l2 text NULL,
  item_name text NOT NULL,
  item_option text NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL
);

CREATE TABLE IF NOT EXISTS public.estimation_item_solution_coefficient_meta (
  item_id uuid NOT NULL,
  solution_variant_id uuid NOT NULL,
  coefficient numeric(12, 4) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT estimation_item_solution_coefficient_pk
    PRIMARY KEY (item_id, solution_variant_id),
  CONSTRAINT estimation_item_solution_coefficient_item_fk
    FOREIGN KEY (item_id)
    REFERENCES public.estimation_standard_item_meta(item_id),
  CONSTRAINT estimation_item_solution_coefficient_variant_fk
    FOREIGN KEY (solution_variant_id)
    REFERENCES public.estimation_solution_variant(solution_variant_id)
);

CREATE TABLE IF NOT EXISTS public.estimation_project_solution_selection (
  project_id uuid NOT NULL,
  solution_variant_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  actual_effort_md numeric(12, 4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT estimation_project_solution_selection_pk
    PRIMARY KEY (project_id, solution_variant_id),
  CONSTRAINT estimation_project_solution_selection_variant_fk
    FOREIGN KEY (solution_variant_id)
    REFERENCES public.estimation_solution_variant(solution_variant_id)
);

COMMENT ON COLUMN public.estimation_project_solution_selection.project_id IS
  'Project FK intentionally omitted in this migration. The app references estimation_projects, but repository DDL does not confirm estimation_projects.id type.';

CREATE TABLE IF NOT EXISTS public.estimation_project_item_solution_selection (
  project_id uuid NOT NULL,
  solution_variant_id uuid NOT NULL,
  item_id uuid NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT estimation_project_item_solution_selection_pk
    PRIMARY KEY (project_id, solution_variant_id, item_id),
  CONSTRAINT estimation_project_item_solution_selection_variant_fk
    FOREIGN KEY (solution_variant_id)
    REFERENCES public.estimation_solution_variant(solution_variant_id),
  CONSTRAINT estimation_project_item_solution_selection_item_fk
    FOREIGN KEY (item_id)
    REFERENCES public.estimation_standard_item_meta(item_id)
);

COMMENT ON COLUMN public.estimation_project_item_solution_selection.project_id IS
  'Project FK intentionally omitted in this migration. The app references estimation_projects, but repository DDL does not confirm estimation_projects.id type.';

CREATE INDEX IF NOT EXISTS estimation_solution_variant_solution_active_idx
  ON public.estimation_solution_variant (solution_code, active);

CREATE INDEX IF NOT EXISTS estimation_standard_base_effort_variant_active_idx
  ON public.estimation_standard_base_effort_meta (solution_variant_id, active);

CREATE UNIQUE INDEX IF NOT EXISTS estimation_standard_item_meta_item_norm_uq
  ON public.estimation_standard_item_meta (
    category_l1,
    COALESCE(category_l2, ''),
    item_name,
    COALESCE(item_option, '')
  );

CREATE INDEX IF NOT EXISTS estimation_standard_item_category_order_idx
  ON public.estimation_standard_item_meta (category_l1, display_order);

CREATE INDEX IF NOT EXISTS estimation_item_solution_coefficient_variant_item_idx
  ON public.estimation_item_solution_coefficient_meta (solution_variant_id, item_id);

CREATE INDEX IF NOT EXISTS estimation_project_solution_project_enabled_idx
  ON public.estimation_project_solution_selection (project_id, enabled);

CREATE INDEX IF NOT EXISTS estimation_project_item_solution_project_variant_checked_idx
  ON public.estimation_project_item_solution_selection (
    project_id,
    solution_variant_id,
    checked
  );

-- Seed plan for a later phase only:
-- solution_code values: pbx, sbc, cti, cms, ivr, oamp, callbot, stat, wfm
-- solution variants: PBX, SBC, CTI v5, CTI v4, CMS, IVR 3.1,
--   IVR EP, OAMP, CallBot, STAT, WFM
-- Base effort rows, item rows, and coefficient rows will be loaded from the
-- Excel standard-effort sheet in a separate seed migration.
