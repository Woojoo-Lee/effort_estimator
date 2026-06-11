package com.company.effort.security;

import java.util.List;
import org.springframework.util.StringUtils;

public record ProjectAccessContext(
    String projectId,
    String ownerUserId,
    String departmentId,
    List<String> assignedUserIds,
    String status,
    String archivedAt
) {

  public ProjectAccessContext {
    projectId = normalizeBlankToNull(projectId);
    ownerUserId = normalizeBlankToNull(ownerUserId);
    departmentId = normalizeBlankToNull(departmentId);
    assignedUserIds = assignedUserIds == null ? List.of() : List.copyOf(assignedUserIds);
    status = normalizeBlankToNull(status);
    archivedAt = normalizeBlankToNull(archivedAt);
  }

  public boolean hasProjectId() {
    return StringUtils.hasText(projectId);
  }

  public boolean isArchived() {
    return "archived".equalsIgnoreCase(status) || StringUtils.hasText(archivedAt);
  }

  public boolean isOwner(String userId) {
    return StringUtils.hasText(userId) && userId.equals(ownerUserId);
  }

  public boolean isSameDepartment(String userDepartmentId) {
    return StringUtils.hasText(userDepartmentId) && userDepartmentId.equals(departmentId);
  }

  public boolean isAssigned(String userId) {
    return StringUtils.hasText(userId) && assignedUserIds.contains(userId);
  }

  private static String normalizeBlankToNull(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }

    return value.trim();
  }
}
