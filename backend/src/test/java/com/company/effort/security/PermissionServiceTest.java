package com.company.effort.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PermissionServiceTest {

  private TestCurrentUserProvider currentUserProvider;
  private PermissionService permissionService;

  @BeforeEach
  void setUp() {
    currentUserProvider = new TestCurrentUserProvider();
    permissionService = new PermissionService(currentUserProvider);
  }

  @Test
  void hasPermissionReturnsTrueWhenPermissionCodeExists() {
    currentUserProvider.setUser(authenticatedUser(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.ROUTE_ESTIMATOR_READ)
    ));

    assertThat(permissionService.hasPermission(PermissionCodes.ROUTE_ESTIMATOR_READ))
        .isTrue();
  }

  @Test
  void hasPermissionReturnsFalseWhenPermissionCodeDoesNotExist() {
    currentUserProvider.setUser(authenticatedUser(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.ROUTE_ESTIMATOR_READ)
    ));

    assertThat(permissionService.hasPermission(PermissionCodes.PROJECT_WRITE_ALL))
        .isFalse();
  }

  @Test
  void systemAdminRoleOnlyDoesNotGrantPermission() {
    currentUserProvider.setUser(authenticatedUser(
        List.of(RoleCodes.SYSTEM_ADMIN),
        List.of()
    ));

    assertThat(permissionService.hasPermission(PermissionCodes.USER_MANAGE))
        .isFalse();
  }

  @Test
  void hasAllPermissionsRequiresEveryPermission() {
    currentUserProvider.setUser(authenticatedUser(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.ROUTE_ESTIMATOR_READ, PermissionCodes.EXPORT_READ)
    ));

    assertThat(permissionService.hasAllPermissions(List.of(
        PermissionCodes.ROUTE_ESTIMATOR_READ,
        PermissionCodes.EXPORT_READ
    ))).isTrue();
  }

  @Test
  void hasAnyPermissionRequiresOnePermission() {
    currentUserProvider.setUser(authenticatedUser(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.EXPORT_READ)
    ));

    assertThat(permissionService.hasAnyPermission(List.of(
        PermissionCodes.ROUTE_ESTIMATOR_READ,
        PermissionCodes.EXPORT_READ
    ))).isTrue();
  }

  @Test
  void nullOrBlankPermissionReturnsFalse() {
    currentUserProvider.setUser(authenticatedUser(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.ROUTE_ESTIMATOR_READ)
    ));

    assertThat(permissionService.hasPermission(null)).isFalse();
    assertThat(permissionService.hasPermission(" ")).isFalse();
  }

  @Test
  void checkPermissionThrowsAuthenticationRequiredWhenUserIsUnauthenticated() {
    currentUserProvider.setUser(new CurrentUser(
        "user-1",
        "user@example.com",
        "User",
        null,
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.ROUTE_ESTIMATOR_READ),
        false,
        true
    ));

    assertThatThrownBy(() -> permissionService.checkPermissions(
        List.of(PermissionCodes.ROUTE_ESTIMATOR_READ),
        PermissionCheckMode.ALL
    )).isInstanceOf(AuthenticationRequiredException.class);
  }

  @Test
  void checkPermissionThrowsPermissionDeniedWhenPermissionIsMissing() {
    currentUserProvider.setUser(authenticatedUser(
        List.of(RoleCodes.VIEWER),
        List.of(PermissionCodes.ROUTE_ESTIMATOR_READ)
    ));

    assertThatThrownBy(() -> permissionService.checkPermissions(
        List.of(PermissionCodes.PROJECT_WRITE_ALL),
        PermissionCheckMode.ALL
    ))
        .isInstanceOf(PermissionDeniedException.class)
        .extracting("requiredPermissions")
        .isEqualTo(List.of(PermissionCodes.PROJECT_WRITE_ALL));
  }

  private static CurrentUser authenticatedUser(
      List<String> roleCodes,
      List<String> permissionCodes
  ) {
    return new CurrentUser(
        "user-1",
        "user@example.com",
        "User",
        null,
        roleCodes,
        permissionCodes,
        true,
        true
    );
  }

  private static final class TestCurrentUserProvider implements CurrentUserProvider {

    private CurrentUser user;

    void setUser(CurrentUser user) {
      this.user = user;
    }

    @Override
    public CurrentUser getCurrentUser() {
      return user;
    }

    @Override
    public PermissionSnapshot getPermissionSnapshot() {
      return PermissionSnapshot.from(user);
    }
  }
}
