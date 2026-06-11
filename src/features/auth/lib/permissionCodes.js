export const PERMISSIONS = {
  ROUTE_ESTIMATOR_READ: "route.estimator.read",
  ROUTE_STANDARD_EFFORT_META_READ: "route.standard_effort_meta.read",
  ROUTE_ITEM_META_READ: "route.item_meta.read",
  ROUTE_PROJECTS_READ: "route.projects.read",

  PROJECT_READ_OWN: "project.read.own",
  PROJECT_READ_DEPARTMENT: "project.read.department",
  PROJECT_READ_ALL: "project.read.all",
  PROJECT_WRITE_OWN: "project.write.own",
  PROJECT_WRITE_ASSIGNED: "project.write.assigned",
  PROJECT_WRITE_ALL: "project.write.all",

  STANDARD_EFFORT_SELECTION_WRITE: "standard_effort.selection.write",
  STANDARD_EFFORT_ACTUAL_EFFORT_WRITE:
    "standard_effort.actual_effort.write",
  STANDARD_EFFORT_REFRESH: "standard_effort.refresh",

  STANDARD_EFFORT_META_BASE_EFFORT_WRITE:
    "standard_effort_meta.base_effort.write",
  STANDARD_EFFORT_META_COEFFICIENT_WRITE:
    "standard_effort_meta.coefficient.write",
  STANDARD_EFFORT_META_ACTIVE_WRITE: "standard_effort_meta.active.write",
  STANDARD_EFFORT_META_VALIDATE_READ: "standard_effort_meta.validate.read",

  USER_MANAGE: "user.manage",
  ROLE_MANAGE: "role.manage",
  AUDIT_READ: "audit.read",

  EXPORT_READ: "export.read",
  EXPORT_STANDARD_EFFORT: "export.standard_effort",
};

export const ROLES = {
  SYSTEM_ADMIN: "system_admin",
  META_ADMIN: "meta_admin",
  ESTIMATOR: "estimator",
  VIEWER: "viewer",
};
