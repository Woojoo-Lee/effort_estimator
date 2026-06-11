-- Additive auth, permission, organization, and audit schema.
-- This migration intentionally avoids physical foreign keys, RLS policies,
-- privilege statements, Supabase Auth coupling, and Tomcat API code.
-- Logical references are validated by the application/service/API layer.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.app_departments (
  department_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code text NOT NULL,
  department_name text NOT NULL,
  parent_department_id uuid NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT app_departments_department_code_uq UNIQUE (department_code)
);

COMMENT ON TABLE public.app_departments IS
  'Application department master. Physical foreign keys are intentionally omitted; logical references are validated by the API/service layer.';
COMMENT ON COLUMN public.app_departments.parent_department_id IS
  'Logical reference to app_departments.department_id. Physical FK intentionally omitted.';

CREATE TABLE IF NOT EXISTS public.app_users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NULL,
  external_provider text NULL,
  external_subject text NULL,
  email text NOT NULL,
  employee_no text NULL,
  display_name text NOT NULL,
  department_id uuid NULL,
  status text NOT NULL DEFAULT 'active',
  last_login_at timestamptz NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT app_users_email_uq UNIQUE (email),
  CONSTRAINT app_users_status_chk
    CHECK (status IN ('active', 'inactive', 'suspended'))
);

COMMENT ON TABLE public.app_users IS
  'Application user master. Physical foreign keys are intentionally omitted; logical references are validated by the API/service layer.';
COMMENT ON COLUMN public.app_users.auth_user_id IS
  'Logical reference that can map to Supabase Auth users or an internal SSO subject. Physical FK intentionally omitted.';
COMMENT ON COLUMN public.app_users.department_id IS
  'Logical reference to app_departments.department_id. Physical FK intentionally omitted.';

CREATE TABLE IF NOT EXISTS public.app_roles (
  role_code text PRIMARY KEY,
  role_name text NOT NULL,
  description text NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL
);

COMMENT ON TABLE public.app_roles IS
  'Application role master. Physical foreign keys are intentionally omitted; logical references are validated by the API/service layer.';

CREATE TABLE IF NOT EXISTS public.app_permissions (
  permission_code text PRIMARY KEY,
  permission_name text NOT NULL,
  description text NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL
);

COMMENT ON TABLE public.app_permissions IS
  'Application permission master. Physical foreign keys are intentionally omitted; logical references are validated by the API/service layer.';

CREATE TABLE IF NOT EXISTS public.app_role_permissions (
  role_code text NOT NULL,
  permission_code text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT app_role_permissions_pk PRIMARY KEY (role_code, permission_code)
);

COMMENT ON TABLE public.app_role_permissions IS
  'Role-permission mapping. role_code and permission_code are logical references; physical FKs are intentionally omitted.';
COMMENT ON COLUMN public.app_role_permissions.role_code IS
  'Logical reference to app_roles.role_code. Physical FK intentionally omitted.';
COMMENT ON COLUMN public.app_role_permissions.permission_code IS
  'Logical reference to app_permissions.permission_code. Physical FK intentionally omitted.';

CREATE TABLE IF NOT EXISTS public.app_user_roles (
  user_role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_code text NOT NULL,
  scope_type text NOT NULL DEFAULT 'global',
  scope_id text NULL,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT app_user_roles_scope_type_chk
    CHECK (scope_type IN ('global', 'department', 'project')),
  CONSTRAINT app_user_roles_date_range_chk
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

COMMENT ON TABLE public.app_user_roles IS
  'User-role assignment. Physical foreign keys are intentionally omitted; logical references are validated by the API/service layer.';
COMMENT ON COLUMN public.app_user_roles.user_id IS
  'Logical reference to app_users.user_id. Physical FK intentionally omitted.';
COMMENT ON COLUMN public.app_user_roles.role_code IS
  'Logical reference to app_roles.role_code. Physical FK intentionally omitted.';
COMMENT ON COLUMN public.app_user_roles.scope_id IS
  'Logical reference interpreted by scope_type, such as department_id or project_id. Stored as text for cross-platform API compatibility.';

CREATE TABLE IF NOT EXISTS public.app_project_members (
  project_member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id bigint NOT NULL,
  user_id uuid NOT NULL,
  member_role text NOT NULL DEFAULT 'member',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT app_project_members_member_role_chk
    CHECK (member_role IN ('owner', 'editor', 'viewer', 'pm', 'sales', 'member')),
  CONSTRAINT app_project_members_project_user_role_uq
    UNIQUE (project_id, user_id, member_role)
);

COMMENT ON TABLE public.app_project_members IS
  'Project member mapping. Physical foreign keys are intentionally omitted; logical references are validated by the API/service layer.';
COMMENT ON COLUMN public.app_project_members.project_id IS
  'Logical reference to estimation_projects.id. Type is bigint/int8. Physical FK intentionally omitted.';
COMMENT ON COLUMN public.app_project_members.user_id IS
  'Logical reference to app_users.user_id. Physical FK intentionally omitted.';

CREATE TABLE IF NOT EXISTS public.app_audit_logs (
  audit_log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_result text NOT NULL DEFAULT 'success',
  actor_user_id uuid NULL,
  actor_email text NULL,
  target_type text NOT NULL,
  target_id text NULL,
  project_id bigint NULL,
  before_json jsonb NULL,
  after_json jsonb NULL,
  metadata_json jsonb NULL,
  ip_address inet NULL,
  user_agent text NULL,
  request_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_audit_logs_event_result_chk
    CHECK (event_result IN ('success', 'failure'))
);

COMMENT ON TABLE public.app_audit_logs IS
  'Application audit log. Long-term authoritative audit records should be written by the backend/Tomcat API. Physical FKs are intentionally omitted.';
COMMENT ON COLUMN public.app_audit_logs.actor_user_id IS
  'Logical reference to app_users.user_id. Physical FK intentionally omitted.';
COMMENT ON COLUMN public.app_audit_logs.project_id IS
  'Logical reference to estimation_projects.id. Type is bigint/int8. Physical FK intentionally omitted.';
COMMENT ON COLUMN public.app_audit_logs.event_type IS
  'Event type examples: auth.login, auth.logout, project.create, project.update, project.delete, standard_effort.solution.toggle, standard_effort.item.check, standard_effort.actual_effort.update, standard_effort_meta.base_effort.update, standard_effort_meta.coefficient.update, standard_effort_meta.active.update, role.assign, role.revoke, export.download.';

CREATE INDEX IF NOT EXISTS app_departments_parent_idx
  ON public.app_departments (parent_department_id);
CREATE INDEX IF NOT EXISTS app_departments_active_idx
  ON public.app_departments (active);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_auth_user_uq
  ON public.app_users (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_external_subject_uq
  ON public.app_users (external_provider, external_subject)
  WHERE external_provider IS NOT NULL
    AND external_subject IS NOT NULL;
CREATE INDEX IF NOT EXISTS app_users_email_idx
  ON public.app_users (email);
CREATE INDEX IF NOT EXISTS app_users_department_idx
  ON public.app_users (department_id);
CREATE INDEX IF NOT EXISTS app_users_status_idx
  ON public.app_users (status);
CREATE INDEX IF NOT EXISTS app_users_active_idx
  ON public.app_users (active);

CREATE INDEX IF NOT EXISTS app_role_permissions_role_idx
  ON public.app_role_permissions (role_code);
CREATE INDEX IF NOT EXISTS app_role_permissions_permission_idx
  ON public.app_role_permissions (permission_code);

CREATE UNIQUE INDEX IF NOT EXISTS app_user_roles_user_role_scope_uq
  ON public.app_user_roles (
    user_id,
    role_code,
    scope_type,
    COALESCE(scope_id, '')
  );
CREATE INDEX IF NOT EXISTS app_user_roles_user_idx
  ON public.app_user_roles (user_id, active);
CREATE INDEX IF NOT EXISTS app_user_roles_role_idx
  ON public.app_user_roles (role_code, active);
CREATE INDEX IF NOT EXISTS app_user_roles_scope_idx
  ON public.app_user_roles (scope_type, scope_id);

CREATE INDEX IF NOT EXISTS app_project_members_project_idx
  ON public.app_project_members (project_id, active);
CREATE INDEX IF NOT EXISTS app_project_members_user_idx
  ON public.app_project_members (user_id, active);

CREATE INDEX IF NOT EXISTS app_audit_logs_event_type_created_idx
  ON public.app_audit_logs (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS app_audit_logs_actor_created_idx
  ON public.app_audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS app_audit_logs_target_idx
  ON public.app_audit_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS app_audit_logs_project_created_idx
  ON public.app_audit_logs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS app_audit_logs_request_idx
  ON public.app_audit_logs (request_id);

INSERT INTO public.app_roles (role_code, role_name, description, active, updated_at)
VALUES
  ('system_admin', 'System Admin', 'Full system, user, role, project, metadata, and operation administration.', true, now()),
  ('meta_admin', 'Meta Admin', 'Standard effort metadata administration.', true, now()),
  ('estimator', 'Estimator', 'Project estimation and standard effort selection user.', true, now()),
  ('viewer', 'Viewer', 'Read-only project and estimation viewer.', true, now())
ON CONFLICT (role_code) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  description = EXCLUDED.description,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.app_permissions (permission_code, permission_name, description, active, updated_at)
VALUES
  ('route.estimator.read', 'View Estimator Route', 'Access the estimator route.', true, now()),
  ('route.standard_effort_meta.read', 'View Standard Effort Meta Route', 'Access the standard effort metadata route.', true, now()),
  ('route.item_meta.read', 'View Item Meta Route', 'Access the legacy item metadata route.', true, now()),
  ('route.projects.read', 'View Projects Route', 'Access the project management route.', true, now()),
  ('project.read.own', 'Read Own Projects', 'Read projects owned by the user.', true, now()),
  ('project.read.department', 'Read Department Projects', 'Read projects in the user department scope.', true, now()),
  ('project.read.all', 'Read All Projects', 'Read all projects.', true, now()),
  ('project.write.own', 'Write Own Projects', 'Create or update projects owned by the user.', true, now()),
  ('project.write.assigned', 'Write Assigned Projects', 'Update projects where the user is assigned as an editor/member.', true, now()),
  ('project.write.all', 'Write All Projects', 'Create or update any project.', true, now()),
  ('standard_effort.selection.write', 'Write Standard Effort Selections', 'Save selected standard effort solutions and items.', true, now()),
  ('standard_effort.actual_effort.write', 'Write Actual Effort', 'Save actual effort in M/M.', true, now()),
  ('standard_effort.refresh', 'Refresh Standard Effort', 'Reload standard effort metadata and selections.', true, now()),
  ('standard_effort_meta.base_effort.write', 'Write Base Effort Meta', 'Update standard effort base effort rows in M/M.', true, now()),
  ('standard_effort_meta.coefficient.write', 'Write Coefficient Meta', 'Update standard effort coefficient rows.', true, now()),
  ('standard_effort_meta.active.write', 'Write Standard Effort Active Flags', 'Update active flags for standard effort variants and items.', true, now()),
  ('standard_effort_meta.validate.read', 'Read Standard Effort Validation', 'View standard effort validation and preview summaries.', true, now()),
  ('user.manage', 'Manage Users', 'Create, update, and deactivate users.', true, now()),
  ('role.manage', 'Manage Roles', 'Assign roles and manage permissions.', true, now()),
  ('audit.read', 'Read Audit Logs', 'View application audit logs.', true, now()),
  ('export.read', 'Use Export', 'Use export and download features.', true, now()),
  ('export.standard_effort', 'Export Standard Effort', 'Export standard effort results.', true, now())
ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  description = EXCLUDED.description,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.app_role_permissions (role_code, permission_code, allowed, updated_at)
SELECT 'system_admin', permission_code, true, now()
FROM public.app_permissions
ON CONFLICT (role_code, permission_code) DO UPDATE SET
  allowed = EXCLUDED.allowed,
  updated_at = now();

INSERT INTO public.app_role_permissions (role_code, permission_code, allowed, updated_at)
VALUES
  ('meta_admin', 'route.estimator.read', true, now()),
  ('meta_admin', 'route.standard_effort_meta.read', true, now()),
  ('meta_admin', 'route.projects.read', true, now()),
  ('meta_admin', 'project.read.department', true, now()),
  ('meta_admin', 'standard_effort.refresh', true, now()),
  ('meta_admin', 'standard_effort_meta.base_effort.write', true, now()),
  ('meta_admin', 'standard_effort_meta.coefficient.write', true, now()),
  ('meta_admin', 'standard_effort_meta.active.write', true, now()),
  ('meta_admin', 'standard_effort_meta.validate.read', true, now()),
  ('estimator', 'route.estimator.read', true, now()),
  ('estimator', 'route.projects.read', true, now()),
  ('estimator', 'project.read.own', true, now()),
  ('estimator', 'project.read.department', true, now()),
  ('estimator', 'project.write.own', true, now()),
  ('estimator', 'project.write.assigned', true, now()),
  ('estimator', 'standard_effort.selection.write', true, now()),
  ('estimator', 'standard_effort.actual_effort.write', true, now()),
  ('estimator', 'standard_effort.refresh', true, now()),
  ('estimator', 'export.read', true, now()),
  ('estimator', 'export.standard_effort', true, now()),
  ('viewer', 'route.estimator.read', true, now()),
  ('viewer', 'route.projects.read', true, now()),
  ('viewer', 'project.read.own', true, now()),
  ('viewer', 'export.read', true, now())
ON CONFLICT (role_code, permission_code) DO UPDATE SET
  allowed = EXCLUDED.allowed,
  updated_at = now();

COMMIT;
