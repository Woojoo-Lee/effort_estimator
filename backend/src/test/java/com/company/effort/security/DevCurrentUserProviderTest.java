package com.company.effort.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DevCurrentUserProviderTest {

  @Test
  void normalizesCommaSeparatedRoleCodes() {
    DevCurrentUserProvider provider = provider(
        " system_admin, viewer, system_admin ",
        PermissionCodes.ROUTE_ESTIMATOR_READ
    );

    assertThat(provider.getCurrentUser().roleCodes())
        .containsExactly(RoleCodes.SYSTEM_ADMIN, RoleCodes.VIEWER);
  }

  @Test
  void normalizesCommaSeparatedPermissionCodes() {
    DevCurrentUserProvider provider = provider(
        RoleCodes.VIEWER,
        " route.estimator.read, project.read.own, route.estimator.read "
    );

    assertThat(provider.getCurrentUser().permissionCodes())
        .containsExactly(
            PermissionCodes.ROUTE_ESTIMATOR_READ,
            PermissionCodes.PROJECT_READ_OWN
        );
  }

  @Test
  void removesBlanksAndDuplicates() {
    assertThat(DevCurrentUserProvider.normalizeCsv("viewer, , viewer, estimator,"))
        .containsExactly(RoleCodes.VIEWER, RoleCodes.ESTIMATOR);
  }

  @Test
  void createsDefaultDevUser() {
    DevCurrentUserProvider provider = provider(
        RoleCodes.VIEWER,
        PermissionCodes.ROUTE_ESTIMATOR_READ
    );

    CurrentUser user = provider.getCurrentUser();

    assertThat(user.userId()).isEqualTo("00000000-0000-0000-0000-000000000001");
    assertThat(user.email()).isEqualTo("dev@example.com");
    assertThat(user.displayName()).isEqualTo("Dev User");
    assertThat(user.devOnly()).isTrue();
    assertThat(user.authenticated()).isTrue();
  }

  @Test
  void doesNotGeneratePermissionsFromRoleOnly() {
    DevCurrentUserProvider provider = provider(
        RoleCodes.SYSTEM_ADMIN,
        PermissionCodes.ROUTE_ESTIMATOR_READ
    );

    assertThat(provider.getCurrentUser().roleCodes())
        .containsExactly(RoleCodes.SYSTEM_ADMIN);
    assertThat(provider.getCurrentUser().permissionCodes())
        .containsExactly(PermissionCodes.ROUTE_ESTIMATOR_READ);
    assertThat(provider.getCurrentUser().permissionCodes())
        .doesNotContain(PermissionCodes.USER_MANAGE);
  }

  private DevCurrentUserProvider provider(String roleCodes, String permissionCodes) {
    return new DevCurrentUserProvider(
        "dev",
        "00000000-0000-0000-0000-000000000001",
        "dev@example.com",
        "Dev User",
        "",
        roleCodes,
        permissionCodes
    );
  }
}
