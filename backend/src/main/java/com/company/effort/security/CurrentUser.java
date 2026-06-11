package com.company.effort.security;

import java.util.List;

public record CurrentUser(
    String userId,
    String email,
    String displayName,
    String departmentId,
    List<String> roleCodes,
    List<String> permissionCodes,
    boolean authenticated,
    boolean devOnly
) {
}
