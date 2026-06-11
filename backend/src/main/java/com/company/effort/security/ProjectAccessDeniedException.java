package com.company.effort.security;

public class ProjectAccessDeniedException extends RuntimeException {

  private final ProjectAccessDecision decision;

  public ProjectAccessDeniedException(ProjectAccessDecision decision) {
    super("프로젝트 접근 권한이 없습니다.");
    this.decision = decision;
  }

  public ProjectAccessDecision getDecision() {
    return decision;
  }
}
