package com.company.effort.security;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class DevCurrentUserProvider implements CurrentUserProvider {

  private static final String SUPPORTED_MODE = "dev";

  private final String securityMode;
  private final CurrentUser currentUser;

  public DevCurrentUserProvider(
      @Value("${app.security.mode:dev}") String securityMode,
      @Value("${app.security.dev.user-id:00000000-0000-0000-0000-000000000001}")
      String userId,
      @Value("${app.security.dev.email:dev@example.com}") String email,
      @Value("${app.security.dev.display-name:Dev User}") String displayName,
      @Value("${app.security.dev.department-id:}") String departmentId,
      @Value("${app.security.dev.role-codes:viewer}") String roleCodes,
      @Value("${app.security.dev.permission-codes:"
          + "route.estimator.read,project.read.own,export.read}") String permissionCodes
  ) {
    this.securityMode = normalizeMode(securityMode);
    this.currentUser = new CurrentUser(
        userId,
        email,
        displayName,
        normalizeBlankToNull(departmentId),
        normalizeCsv(roleCodes),
        normalizeCsv(permissionCodes),
        true,
        true
    );
  }

  @Override
  public CurrentUser getCurrentUser() {
    ensureDevMode();
    return currentUser;
  }

  @Override
  public PermissionSnapshot getPermissionSnapshot() {
    return PermissionSnapshot.from(getCurrentUser());
  }

  private void ensureDevMode() {
    if (!SUPPORTED_MODE.equals(securityMode)) {
      throw new IllegalStateException(
          "Only app.security.mode=dev is supported in this scaffold phase."
      );
    }
  }

  static List<String> normalizeCsv(String value) {
    if (!StringUtils.hasText(value)) {
      return List.of();
    }

    String[] tokens = value.split(",");
    LinkedHashSet<String> normalized = new LinkedHashSet<>();

    for (String token : tokens) {
      String trimmed = token.trim();
      if (StringUtils.hasText(trimmed)) {
        normalized.add(trimmed);
      }
    }

    return List.copyOf(new ArrayList<>(normalized));
  }

  private static String normalizeMode(String value) {
    if (!StringUtils.hasText(value)) {
      return SUPPORTED_MODE;
    }

    return value.trim().toLowerCase();
  }

  private static String normalizeBlankToNull(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }

    return value.trim();
  }
}
