package com.company.effort.security;

import java.util.List;

public final class PermissionCodes {

  public static final String ROUTE_ESTIMATOR_READ = "route.estimator.read";
  public static final String ROUTE_STANDARD_EFFORT_META_READ =
      "route.standard_effort_meta.read";
  public static final String ROUTE_ITEM_META_READ = "route.item_meta.read";
  public static final String ROUTE_PROJECTS_READ = "route.projects.read";

  public static final String PROJECT_READ_OWN = "project.read.own";
  public static final String PROJECT_READ_DEPARTMENT = "project.read.department";
  public static final String PROJECT_READ_ALL = "project.read.all";
  public static final String PROJECT_WRITE_OWN = "project.write.own";
  public static final String PROJECT_WRITE_ASSIGNED = "project.write.assigned";
  public static final String PROJECT_WRITE_ALL = "project.write.all";

  public static final String STANDARD_EFFORT_SELECTION_WRITE =
      "standard_effort.selection.write";
  public static final String STANDARD_EFFORT_ACTUAL_EFFORT_WRITE =
      "standard_effort.actual_effort.write";
  public static final String STANDARD_EFFORT_REFRESH = "standard_effort.refresh";

  public static final String STANDARD_EFFORT_META_BASE_EFFORT_WRITE =
      "standard_effort_meta.base_effort.write";
  public static final String STANDARD_EFFORT_META_COEFFICIENT_WRITE =
      "standard_effort_meta.coefficient.write";
  public static final String STANDARD_EFFORT_META_ACTIVE_WRITE =
      "standard_effort_meta.active.write";
  public static final String STANDARD_EFFORT_META_VALIDATE_READ =
      "standard_effort_meta.validate.read";

  public static final String EXPORT_READ = "export.read";
  public static final String EXPORT_STANDARD_EFFORT = "export.standard_effort";

  public static final String USER_MANAGE = "user.manage";
  public static final String ROLE_MANAGE = "role.manage";
  public static final String AUDIT_READ = "audit.read";

  public static final List<String> ALL = List.of(
      ROUTE_ESTIMATOR_READ,
      ROUTE_STANDARD_EFFORT_META_READ,
      ROUTE_ITEM_META_READ,
      ROUTE_PROJECTS_READ,
      PROJECT_READ_OWN,
      PROJECT_READ_DEPARTMENT,
      PROJECT_READ_ALL,
      PROJECT_WRITE_OWN,
      PROJECT_WRITE_ASSIGNED,
      PROJECT_WRITE_ALL,
      STANDARD_EFFORT_SELECTION_WRITE,
      STANDARD_EFFORT_ACTUAL_EFFORT_WRITE,
      STANDARD_EFFORT_REFRESH,
      STANDARD_EFFORT_META_BASE_EFFORT_WRITE,
      STANDARD_EFFORT_META_COEFFICIENT_WRITE,
      STANDARD_EFFORT_META_ACTIVE_WRITE,
      STANDARD_EFFORT_META_VALIDATE_READ,
      EXPORT_READ,
      EXPORT_STANDARD_EFFORT,
      USER_MANAGE,
      ROLE_MANAGE,
      AUDIT_READ
  );

  private PermissionCodes() {
  }
}
