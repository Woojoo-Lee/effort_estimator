package com.company.effort.security;

import java.util.List;

public record PermissionSnapshot(
    CurrentUser user,
    List<String> roleCodes,
    List<String> permissionCodes,
    List<String> permissions,
    boolean devOnly
) {

  public static PermissionSnapshot from(CurrentUser user) {
    return new PermissionSnapshot(
        user,
        user.roleCodes(),
        user.permissionCodes(),
        user.permissionCodes(),
        user.devOnly()
    );
  }
}
