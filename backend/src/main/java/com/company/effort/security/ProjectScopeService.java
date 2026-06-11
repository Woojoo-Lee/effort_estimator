package com.company.effort.security;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ProjectScopeService {

  private static final List<String> READ_PERMISSIONS = List.of(
      PermissionCodes.PROJECT_READ_ALL,
      PermissionCodes.PROJECT_READ_DEPARTMENT,
      PermissionCodes.PROJECT_READ_OWN
  );

  private static final List<String> WRITE_PERMISSIONS = List.of(
      PermissionCodes.PROJECT_WRITE_ALL,
      PermissionCodes.PROJECT_WRITE_OWN,
      PermissionCodes.PROJECT_WRITE_ASSIGNED
  );

  private static final List<String> WRITE_ALL_PERMISSION =
      List.of(PermissionCodes.PROJECT_WRITE_ALL);

  private final CurrentUserProvider currentUserProvider;
  private final PermissionService permissionService;

  public ProjectScopeService(
      CurrentUserProvider currentUserProvider,
      PermissionService permissionService
  ) {
    this.currentUserProvider = currentUserProvider;
    this.permissionService = permissionService;
  }

  public ProjectAccessDecision decide(
      ProjectAccessAction action,
      ProjectAccessContext context
  ) {
    CurrentUser currentUser = currentUserProvider.getCurrentUser();
    if (currentUser == null || !currentUser.authenticated()) {
      return ProjectAccessDecision.denied(
          action,
          context,
          ProjectAccessDecision.DENIED_UNAUTHENTICATED,
          requiredPermissions(action)
      );
    }

    if (action == null || context == null || !context.hasProjectId()) {
      return ProjectAccessDecision.denied(
          action,
          context,
          ProjectAccessDecision.DENIED_INVALID_CONTEXT,
          requiredPermissions(action)
      );
    }

    return switch (action) {
      case READ -> decideRead(currentUser, context);
      case WRITE -> decideWrite(currentUser, context);
      case ARCHIVE -> decideArchive(context);
      case RESTORE -> decideRestore(context);
    };
  }

  public boolean canRead(ProjectAccessContext context) {
    return decide(ProjectAccessAction.READ, context).allowed();
  }

  public boolean canWrite(ProjectAccessContext context) {
    return decide(ProjectAccessAction.WRITE, context).allowed();
  }

  public boolean canArchive(ProjectAccessContext context) {
    return decide(ProjectAccessAction.ARCHIVE, context).allowed();
  }

  public boolean canRestore(ProjectAccessContext context) {
    return decide(ProjectAccessAction.RESTORE, context).allowed();
  }

  public void requireRead(ProjectAccessContext context) {
    require(ProjectAccessAction.READ, context);
  }

  public void requireWrite(ProjectAccessContext context) {
    require(ProjectAccessAction.WRITE, context);
  }

  public void requireArchive(ProjectAccessContext context) {
    require(ProjectAccessAction.ARCHIVE, context);
  }

  public void requireRestore(ProjectAccessContext context) {
    require(ProjectAccessAction.RESTORE, context);
  }

  private void require(ProjectAccessAction action, ProjectAccessContext context) {
    ProjectAccessDecision decision = decide(action, context);
    if (decision.allowed()) {
      return;
    }

    if (ProjectAccessDecision.DENIED_UNAUTHENTICATED.equals(decision.reason())) {
      throw new AuthenticationRequiredException();
    }

    throw new ProjectAccessDeniedException(decision);
  }

  private ProjectAccessDecision decideRead(
      CurrentUser currentUser,
      ProjectAccessContext context
  ) {
    if (permissionService.hasPermission(PermissionCodes.PROJECT_READ_ALL)) {
      return ProjectAccessDecision.allowed(
          ProjectAccessAction.READ,
          context,
          ProjectAccessDecision.ALLOWED_BY_READ_ALL,
          List.of(PermissionCodes.PROJECT_READ_ALL)
      );
    }

    if (permissionService.hasPermission(PermissionCodes.PROJECT_READ_DEPARTMENT)
        && context.isSameDepartment(currentUser.departmentId())) {
      return ProjectAccessDecision.allowed(
          ProjectAccessAction.READ,
          context,
          ProjectAccessDecision.ALLOWED_BY_READ_DEPARTMENT,
          List.of(PermissionCodes.PROJECT_READ_DEPARTMENT)
      );
    }

    if (permissionService.hasPermission(PermissionCodes.PROJECT_READ_OWN)
        && context.isOwner(currentUser.userId())) {
      return ProjectAccessDecision.allowed(
          ProjectAccessAction.READ,
          context,
          ProjectAccessDecision.ALLOWED_BY_READ_OWN,
          List.of(PermissionCodes.PROJECT_READ_OWN)
      );
    }

    return ProjectAccessDecision.denied(
        ProjectAccessAction.READ,
        context,
        ProjectAccessDecision.DENIED_MISSING_PERMISSION,
        READ_PERMISSIONS
    );
  }

  private ProjectAccessDecision decideWrite(
      CurrentUser currentUser,
      ProjectAccessContext context
  ) {
    if (context.isArchived()) {
      return ProjectAccessDecision.denied(
          ProjectAccessAction.WRITE,
          context,
          ProjectAccessDecision.DENIED_ARCHIVED_PROJECT,
          WRITE_PERMISSIONS
      );
    }

    if (permissionService.hasPermission(PermissionCodes.PROJECT_WRITE_ALL)) {
      return ProjectAccessDecision.allowed(
          ProjectAccessAction.WRITE,
          context,
          ProjectAccessDecision.ALLOWED_BY_WRITE_ALL,
          List.of(PermissionCodes.PROJECT_WRITE_ALL)
      );
    }

    if (permissionService.hasPermission(PermissionCodes.PROJECT_WRITE_OWN)
        && context.isOwner(currentUser.userId())) {
      return ProjectAccessDecision.allowed(
          ProjectAccessAction.WRITE,
          context,
          ProjectAccessDecision.ALLOWED_BY_WRITE_OWN,
          List.of(PermissionCodes.PROJECT_WRITE_OWN)
      );
    }

    if (permissionService.hasPermission(PermissionCodes.PROJECT_WRITE_ASSIGNED)
        && context.isAssigned(currentUser.userId())) {
      return ProjectAccessDecision.allowed(
          ProjectAccessAction.WRITE,
          context,
          ProjectAccessDecision.ALLOWED_BY_WRITE_ASSIGNED,
          List.of(PermissionCodes.PROJECT_WRITE_ASSIGNED)
      );
    }

    return ProjectAccessDecision.denied(
        ProjectAccessAction.WRITE,
        context,
        ProjectAccessDecision.DENIED_MISSING_PERMISSION,
        WRITE_PERMISSIONS
    );
  }

  private ProjectAccessDecision decideArchive(ProjectAccessContext context) {
    if (context.isArchived()) {
      return ProjectAccessDecision.denied(
          ProjectAccessAction.ARCHIVE,
          context,
          ProjectAccessDecision.DENIED_ARCHIVED_PROJECT,
          WRITE_ALL_PERMISSION
      );
    }

    if (permissionService.hasPermission(PermissionCodes.PROJECT_WRITE_ALL)) {
      return ProjectAccessDecision.allowed(
          ProjectAccessAction.ARCHIVE,
          context,
          ProjectAccessDecision.ALLOWED_BY_WRITE_ALL,
          WRITE_ALL_PERMISSION
      );
    }

    return ProjectAccessDecision.denied(
        ProjectAccessAction.ARCHIVE,
        context,
        ProjectAccessDecision.DENIED_MISSING_PERMISSION,
        WRITE_ALL_PERMISSION
    );
  }

  private ProjectAccessDecision decideRestore(ProjectAccessContext context) {
    if (permissionService.hasPermission(PermissionCodes.PROJECT_WRITE_ALL)) {
      return ProjectAccessDecision.allowed(
          ProjectAccessAction.RESTORE,
          context,
          ProjectAccessDecision.ALLOWED_BY_WRITE_ALL,
          WRITE_ALL_PERMISSION
      );
    }

    return ProjectAccessDecision.denied(
        ProjectAccessAction.RESTORE,
        context,
        ProjectAccessDecision.DENIED_MISSING_PERMISSION,
        WRITE_ALL_PERMISSION
    );
  }

  private static List<String> requiredPermissions(ProjectAccessAction action) {
    if (action == null) {
      return List.of();
    }

    return switch (action) {
      case READ -> READ_PERMISSIONS;
      case WRITE -> WRITE_PERMISSIONS;
      case ARCHIVE, RESTORE -> WRITE_ALL_PERMISSION;
    };
  }
}
