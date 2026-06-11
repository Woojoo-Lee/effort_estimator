package com.company.effort.security;

import java.util.List;

public class PermissionDeniedException extends RuntimeException {

  private final List<String> requiredPermissions;

  public PermissionDeniedException(List<String> requiredPermissions) {
    super("접근 권한이 없습니다.");
    this.requiredPermissions = List.copyOf(requiredPermissions);
  }

  public List<String> getRequiredPermissions() {
    return requiredPermissions;
  }
}
