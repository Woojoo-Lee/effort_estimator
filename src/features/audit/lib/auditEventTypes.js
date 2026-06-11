export const AUDIT_EVENT_TYPES = {
  AUTH_LOGIN: "auth.login",
  AUTH_LOGOUT: "auth.logout",

  PROJECT_CREATE: "project.create",
  PROJECT_UPDATE: "project.update",
  PROJECT_DELETE: "project.delete",

  STANDARD_EFFORT_SOLUTION_TOGGLE: "standard_effort.solution.toggle",
  STANDARD_EFFORT_ITEM_CHECK: "standard_effort.item.check",
  STANDARD_EFFORT_ACTUAL_EFFORT_UPDATE:
    "standard_effort.actual_effort.update",
  STANDARD_EFFORT_REFRESH: "standard_effort.refresh",

  STANDARD_EFFORT_META_BASE_EFFORT_UPDATE:
    "standard_effort_meta.base_effort.update",
  STANDARD_EFFORT_META_COEFFICIENT_UPDATE:
    "standard_effort_meta.coefficient.update",
  STANDARD_EFFORT_META_ACTIVE_UPDATE: "standard_effort_meta.active.update",

  ROLE_ASSIGN: "role.assign",
  ROLE_REVOKE: "role.revoke",

  EXPORT_DOWNLOAD: "export.download",
};

export const AUDIT_EVENT_RESULTS = {
  SUCCESS: "success",
  FAILURE: "failure",
};

export const AUDIT_TARGET_TYPES = {
  AUTH: "auth",
  PROJECT: "project",
  STANDARD_EFFORT: "standard_effort",
  STANDARD_EFFORT_META: "standard_effort_meta",
  USER: "user",
  ROLE: "role",
  EXPORT: "export",
};
