package com.company.effort.security;

import java.util.List;

public record ProjectAccessDecision(
    boolean allowed,
    ProjectAccessAction action,
    String projectId,
    String reason,
    List<String> requiredPermissions
) {

  public static final String ALLOWED_BY_READ_ALL = "ALLOWED_BY_READ_ALL";
  public static final String ALLOWED_BY_READ_DEPARTMENT =
      "ALLOWED_BY_READ_DEPARTMENT";
  public static final String ALLOWED_BY_READ_OWN = "ALLOWED_BY_READ_OWN";
  public static final String ALLOWED_BY_WRITE_ALL = "ALLOWED_BY_WRITE_ALL";
  public static final String ALLOWED_BY_WRITE_OWN = "ALLOWED_BY_WRITE_OWN";
  public static final String ALLOWED_BY_WRITE_ASSIGNED =
      "ALLOWED_BY_WRITE_ASSIGNED";
  public static final String DENIED_UNAUTHENTICATED = "DENIED_UNAUTHENTICATED";
  public static final String DENIED_MISSING_PERMISSION =
      "DENIED_MISSING_PERMISSION";
  public static final String DENIED_ARCHIVED_PROJECT = "DENIED_ARCHIVED_PROJECT";
  public static final String DENIED_INVALID_CONTEXT = "DENIED_INVALID_CONTEXT";

  public ProjectAccessDecision {
    requiredPermissions = requiredPermissions == null
        ? List.of()
        : List.copyOf(requiredPermissions);
  }

  public static ProjectAccessDecision allowed(
      ProjectAccessAction action,
      ProjectAccessContext context,
      String reason,
      List<String> requiredPermissions
  ) {
    return new ProjectAccessDecision(
        true,
        action,
        context == null ? null : context.projectId(),
        reason,
        requiredPermissions
    );
  }

  public static ProjectAccessDecision denied(
      ProjectAccessAction action,
      ProjectAccessContext context,
      String reason,
      List<String> requiredPermissions
  ) {
    return new ProjectAccessDecision(
        false,
        action,
        context == null ? null : context.projectId(),
        reason,
        requiredPermissions
    );
  }
}
