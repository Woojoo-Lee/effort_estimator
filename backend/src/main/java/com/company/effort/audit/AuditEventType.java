package com.company.effort.audit;

public final class AuditEventType {

  public static final String PROJECT_CREATE = "project.create";
  public static final String PROJECT_UPDATE = "project.update";
  public static final String PROJECT_ARCHIVE = "project.archive";
  public static final String PROJECT_RESTORE = "project.restore";
  public static final String PROJECT_VERSION_CREATE = "project.version.create";
  public static final String STANDARD_EFFORT_SOLUTION_TOGGLE =
      "standard_effort.solution.toggle";
  public static final String STANDARD_EFFORT_ITEM_CHECK = "standard_effort.item.check";
  public static final String STANDARD_EFFORT_ACTUAL_EFFORT_UPDATE =
      "standard_effort.actual_effort.update";
  public static final String STANDARD_EFFORT_META_BASE_EFFORT_UPDATE =
      "standard_effort_meta.base_effort.update";
  public static final String STANDARD_EFFORT_META_COEFFICIENT_UPDATE =
      "standard_effort_meta.coefficient.update";
  public static final String STANDARD_EFFORT_META_ACTIVE_UPDATE =
      "standard_effort_meta.active.update";
  public static final String EXPORT_DOWNLOAD = "export.download";
  public static final String CODEBOOK_CREATE = "codebook.create";
  public static final String CODEBOOK_UPDATE = "codebook.update";
  public static final String CODEBOOK_ACTIVE_UPDATE = "codebook.active.update";
  public static final String ROLE_ASSIGN = "role.assign";
  public static final String ROLE_REVOKE = "role.revoke";

  private AuditEventType() {
  }
}
