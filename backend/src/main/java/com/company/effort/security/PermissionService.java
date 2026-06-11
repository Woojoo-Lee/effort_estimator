package com.company.effort.security;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class PermissionService {

  private final CurrentUserProvider currentUserProvider;

  public PermissionService(CurrentUserProvider currentUserProvider) {
    this.currentUserProvider = currentUserProvider;
  }

  public CurrentUser getCurrentUser() {
    return currentUserProvider.getCurrentUser();
  }

  public boolean hasPermission(String permission) {
    if (!StringUtils.hasText(permission)) {
      return false;
    }

    CurrentUser currentUser = getCurrentUser();
    if (currentUser == null || !currentUser.authenticated()
        || currentUser.permissionCodes() == null) {
      return false;
    }

    return currentUser.permissionCodes().contains(permission.trim());
  }

  public boolean hasAllPermissions(Collection<String> permissions) {
    List<String> requiredPermissions = normalizePermissions(permissions);
    if (requiredPermissions.isEmpty()) {
      return false;
    }

    return requiredPermissions.stream().allMatch(this::hasPermission);
  }

  public boolean hasAnyPermission(Collection<String> permissions) {
    List<String> requiredPermissions = normalizePermissions(permissions);
    if (requiredPermissions.isEmpty()) {
      return false;
    }

    return requiredPermissions.stream().anyMatch(this::hasPermission);
  }

  public void checkPermission(RequirePermission requirement) {
    if (requirement == null) {
      return;
    }

    checkPermissions(List.of(requirement.value()), requirement.mode());
  }

  public void checkPermissions(Collection<String> permissions, PermissionCheckMode mode) {
    CurrentUser currentUser = getCurrentUser();
    if (currentUser == null || !currentUser.authenticated()) {
      throw new AuthenticationRequiredException();
    }

    List<String> requiredPermissions = normalizePermissions(permissions);
    if (requiredPermissions.isEmpty()) {
      throw new PermissionDeniedException(requiredPermissions);
    }

    boolean allowed = PermissionCheckMode.ANY.equals(mode)
        ? hasAnyPermissions(requiredPermissions)
        : hasEveryPermission(requiredPermissions);

    if (!allowed) {
      throw new PermissionDeniedException(requiredPermissions);
    }
  }

  private boolean hasEveryPermission(List<String> requiredPermissions) {
    Set<String> grantedPermissions = permissionSet();
    return requiredPermissions.stream().allMatch(grantedPermissions::contains);
  }

  private boolean hasAnyPermissions(List<String> requiredPermissions) {
    Set<String> grantedPermissions = permissionSet();
    return requiredPermissions.stream().anyMatch(grantedPermissions::contains);
  }

  private Set<String> permissionSet() {
    CurrentUser currentUser = getCurrentUser();
    if (currentUser == null || currentUser.permissionCodes() == null) {
      return Set.of();
    }

    return new LinkedHashSet<>(currentUser.permissionCodes());
  }

  private static List<String> normalizePermissions(Collection<String> permissions) {
    if (permissions == null || permissions.isEmpty()) {
      return List.of();
    }

    LinkedHashSet<String> normalized = new LinkedHashSet<>();
    for (String permission : permissions) {
      if (StringUtils.hasText(permission)) {
        normalized.add(permission.trim());
      }
    }

    return List.copyOf(normalized);
  }
}
