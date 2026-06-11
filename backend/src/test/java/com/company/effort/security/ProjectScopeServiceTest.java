package com.company.effort.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.company.effort.web.exception.GlobalExceptionHandler;
import com.company.effort.web.filter.RequestIdFilter;
import com.company.effort.web.response.ApiErrorResponse;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

class ProjectScopeServiceTest {

  private TestCurrentUserProvider currentUserProvider;
  private ProjectScopeService projectScopeService;

  @BeforeEach
  void setUp() {
    currentUserProvider = new TestCurrentUserProvider();
    PermissionService permissionService = new PermissionService(currentUserProvider);
    projectScopeService = new ProjectScopeService(currentUserProvider, permissionService);
  }

  @Test
  void readWithProjectReadAllAllows() {
    currentUserProvider.setUser(user(List.of(), List.of(PermissionCodes.PROJECT_READ_ALL)));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.READ, context());

    assertThat(decision.allowed()).isTrue();
    assertThat(decision.reason()).isEqualTo(ProjectAccessDecision.ALLOWED_BY_READ_ALL);
  }

  @Test
  void readWithDepartmentPermissionAndSameDepartmentAllows() {
    currentUserProvider.setUser(user(
        List.of(),
        List.of(PermissionCodes.PROJECT_READ_DEPARTMENT),
        "dept-1"
    ));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.READ, context());

    assertThat(decision.allowed()).isTrue();
    assertThat(decision.reason())
        .isEqualTo(ProjectAccessDecision.ALLOWED_BY_READ_DEPARTMENT);
  }

  @Test
  void readWithDepartmentPermissionAndDifferentDepartmentDenies() {
    currentUserProvider.setUser(user(
        List.of(),
        List.of(PermissionCodes.PROJECT_READ_DEPARTMENT),
        "dept-2"
    ));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.READ, context());

    assertThat(decision.allowed()).isFalse();
    assertThat(decision.reason())
        .isEqualTo(ProjectAccessDecision.DENIED_MISSING_PERMISSION);
  }

  @Test
  void readWithOwnPermissionAndOwnerMatchAllows() {
    currentUserProvider.setUser(user(List.of(), List.of(PermissionCodes.PROJECT_READ_OWN)));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.READ, context());

    assertThat(decision.allowed()).isTrue();
    assertThat(decision.reason()).isEqualTo(ProjectAccessDecision.ALLOWED_BY_READ_OWN);
  }

  @Test
  void readWithOwnPermissionAndOwnerMismatchDenies() {
    currentUserProvider.setUser(user(
        "other-user",
        List.of(),
        List.of(PermissionCodes.PROJECT_READ_OWN),
        "dept-1"
    ));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.READ, context());

    assertThat(decision.allowed()).isFalse();
    assertThat(decision.reason())
        .isEqualTo(ProjectAccessDecision.DENIED_MISSING_PERMISSION);
  }

  @Test
  void writeWithProjectWriteAllAllows() {
    currentUserProvider.setUser(user(List.of(), List.of(PermissionCodes.PROJECT_WRITE_ALL)));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.WRITE, context());

    assertThat(decision.allowed()).isTrue();
    assertThat(decision.reason()).isEqualTo(ProjectAccessDecision.ALLOWED_BY_WRITE_ALL);
  }

  @Test
  void writeWithOwnPermissionAndOwnerMatchAllows() {
    currentUserProvider.setUser(user(List.of(), List.of(PermissionCodes.PROJECT_WRITE_OWN)));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.WRITE, context());

    assertThat(decision.allowed()).isTrue();
    assertThat(decision.reason()).isEqualTo(ProjectAccessDecision.ALLOWED_BY_WRITE_OWN);
  }

  @Test
  void writeWithAssignedPermissionAndAssignedUserAllows() {
    currentUserProvider.setUser(user(
        "assigned-user",
        List.of(),
        List.of(PermissionCodes.PROJECT_WRITE_ASSIGNED),
        "dept-9"
    ));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.WRITE, context());

    assertThat(decision.allowed()).isTrue();
    assertThat(decision.reason())
        .isEqualTo(ProjectAccessDecision.ALLOWED_BY_WRITE_ASSIGNED);
  }

  @Test
  void writeWithArchivedProjectDeniesEvenWithProjectWriteAll() {
    currentUserProvider.setUser(user(List.of(), List.of(PermissionCodes.PROJECT_WRITE_ALL)));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.WRITE, archivedContext());

    assertThat(decision.allowed()).isFalse();
    assertThat(decision.reason()).isEqualTo(ProjectAccessDecision.DENIED_ARCHIVED_PROJECT);
  }

  @Test
  void archiveWithProjectWriteAllAllows() {
    currentUserProvider.setUser(user(List.of(), List.of(PermissionCodes.PROJECT_WRITE_ALL)));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.ARCHIVE, context());

    assertThat(decision.allowed()).isTrue();
    assertThat(decision.reason()).isEqualTo(ProjectAccessDecision.ALLOWED_BY_WRITE_ALL);
  }

  @Test
  void archiveWithOnlyProjectWriteOwnDenies() {
    currentUserProvider.setUser(user(List.of(), List.of(PermissionCodes.PROJECT_WRITE_OWN)));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.ARCHIVE, context());

    assertThat(decision.allowed()).isFalse();
    assertThat(decision.reason())
        .isEqualTo(ProjectAccessDecision.DENIED_MISSING_PERMISSION);
    assertThat(decision.requiredPermissions())
        .containsExactly(PermissionCodes.PROJECT_WRITE_ALL);
  }

  @Test
  void restoreWithProjectWriteAllAllows() {
    currentUserProvider.setUser(user(List.of(), List.of(PermissionCodes.PROJECT_WRITE_ALL)));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.RESTORE, archivedContext());

    assertThat(decision.allowed()).isTrue();
    assertThat(decision.reason()).isEqualTo(ProjectAccessDecision.ALLOWED_BY_WRITE_ALL);
  }

  @Test
  void restoreWithOnlyProjectWriteAssignedDenies() {
    currentUserProvider.setUser(user(
        "assigned-user",
        List.of(),
        List.of(PermissionCodes.PROJECT_WRITE_ASSIGNED),
        "dept-1"
    ));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.RESTORE, archivedContext());

    assertThat(decision.allowed()).isFalse();
    assertThat(decision.requiredPermissions())
        .containsExactly(PermissionCodes.PROJECT_WRITE_ALL);
  }

  @Test
  void systemAdminRoleOnlyDoesNotGrantProjectScopeAccess() {
    currentUserProvider.setUser(user(List.of(RoleCodes.SYSTEM_ADMIN), List.of()));

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.READ, context());

    assertThat(decision.allowed()).isFalse();
    assertThat(decision.reason())
        .isEqualTo(ProjectAccessDecision.DENIED_MISSING_PERMISSION);
  }

  @Test
  void requireThrowsAuthenticationRequiredWhenUserIsUnauthenticated() {
    currentUserProvider.setUser(new CurrentUser(
        "user-1",
        "user@example.com",
        "User",
        "dept-1",
        List.of(),
        List.of(PermissionCodes.PROJECT_WRITE_ALL),
        false,
        true
    ));

    assertThatExceptionOfType(AuthenticationRequiredException.class)
        .isThrownBy(() -> projectScopeService.requireWrite(context()));
  }

  @Test
  void missingProjectIdContextDenies() {
    currentUserProvider.setUser(user(List.of(), List.of(PermissionCodes.PROJECT_READ_ALL)));

    ProjectAccessDecision decision = projectScopeService.decide(
        ProjectAccessAction.READ,
        new ProjectAccessContext(null, "owner-user", "dept-1", List.of(), "active", null)
    );

    assertThat(decision.allowed()).isFalse();
    assertThat(decision.reason()).isEqualTo(ProjectAccessDecision.DENIED_INVALID_CONTEXT);
  }

  @Test
  void numericStringProjectIdIsPreserved() {
    currentUserProvider.setUser(user(List.of(), List.of(PermissionCodes.PROJECT_READ_ALL)));
    ProjectAccessContext context = new ProjectAccessContext(
        "9007199254740993",
        "owner-user",
        "dept-1",
        List.of(),
        "active",
        null
    );

    ProjectAccessDecision decision =
        projectScopeService.decide(ProjectAccessAction.READ, context);

    assertThat(decision.allowed()).isTrue();
    assertThat(decision.projectId()).isEqualTo("9007199254740993");
  }

  @Test
  void statusArchivedMarksContextArchived() {
    ProjectAccessContext context = new ProjectAccessContext(
        "42",
        "owner-user",
        "dept-1",
        List.of(),
        " ARCHIVED ",
        null
    );

    assertThat(context.isArchived()).isTrue();
  }

  @Test
  void archivedAtMarksContextArchived() {
    ProjectAccessContext context = new ProjectAccessContext(
        "42",
        "owner-user",
        "dept-1",
        List.of(),
        "active",
        "2026-06-07T00:00:00Z"
    );

    assertThat(context.isArchived()).isTrue();
  }

  @Test
  void requireReadThrowsProjectAccessDeniedWhenDenied() {
    currentUserProvider.setUser(user(List.of(), List.of()));

    assertThatExceptionOfType(ProjectAccessDeniedException.class)
        .isThrownBy(() -> projectScopeService.requireRead(context()))
        .satisfies(exception ->
            assertThat(exception.getDecision().reason())
                .isEqualTo(ProjectAccessDecision.DENIED_MISSING_PERMISSION)
        );
  }

  @Test
  void requireWriteThrowsProjectAccessDeniedWhenDenied() {
    currentUserProvider.setUser(user(List.of(), List.of()));

    assertThatExceptionOfType(ProjectAccessDeniedException.class)
        .isThrownBy(() -> projectScopeService.requireWrite(context()))
        .satisfies(exception ->
            assertThat(exception.getDecision().action())
                .isEqualTo(ProjectAccessAction.WRITE)
        );
  }

  @Test
  void projectAccessDeniedExceptionReturnsForbiddenWrapper() {
    ProjectAccessDecision decision = ProjectAccessDecision.denied(
        ProjectAccessAction.WRITE,
        context(),
        ProjectAccessDecision.DENIED_MISSING_PERMISSION,
        List.of(PermissionCodes.PROJECT_WRITE_ALL)
    );
    ProjectAccessDeniedException exception = new ProjectAccessDeniedException(decision);
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE, "project-scope-123");

    ResponseEntity<ApiErrorResponse> response =
        new GlobalExceptionHandler().handleProjectAccessDeniedException(exception, request);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().ok()).isFalse();
    assertThat(response.getBody().error().code()).isEqualTo("FORBIDDEN");
    assertThat(response.getBody().error().requestId()).isEqualTo("project-scope-123");
    assertThat(response.getBody().error().details())
        .containsEntry("project_id", "42")
        .containsEntry("reason", ProjectAccessDecision.DENIED_MISSING_PERMISSION);
  }

  private static ProjectAccessContext context() {
    return new ProjectAccessContext(
        "42",
        "owner-user",
        "dept-1",
        List.of("assigned-user"),
        "active",
        null
    );
  }

  private static ProjectAccessContext archivedContext() {
    return new ProjectAccessContext(
        "42",
        "owner-user",
        "dept-1",
        List.of("assigned-user"),
        "archived",
        null
    );
  }

  private static CurrentUser user(List<String> roleCodes, List<String> permissionCodes) {
    return user("owner-user", roleCodes, permissionCodes, "dept-1");
  }

  private static CurrentUser user(
      List<String> roleCodes,
      List<String> permissionCodes,
      String departmentId
  ) {
    return user("owner-user", roleCodes, permissionCodes, departmentId);
  }

  private static CurrentUser user(
      String userId,
      List<String> roleCodes,
      List<String> permissionCodes,
      String departmentId
  ) {
    return new CurrentUser(
        userId,
        userId + "@example.com",
        "User",
        departmentId,
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
