package com.company.effort.project.service;

import com.company.effort.project.dto.ProjectSummaryDto;
import com.company.effort.project.repository.ProjectContextRepository;
import com.company.effort.security.ProjectAccessContext;
import com.company.effort.web.exception.NotFoundException;
import com.company.effort.web.exception.ServiceUnavailableException;
import com.company.effort.web.exception.ValidationException;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ProjectContextService {

  private static final Pattern NUMERIC_PROJECT_ID = Pattern.compile("\\d+");
  private static final String DB_DISABLED_MESSAGE =
      "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0\uC774 "
          + "\uBE44\uD65C\uC131\uD654\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.";

  private final ObjectProvider<ProjectContextRepository> repositoryProvider;

  public ProjectContextService(
      ObjectProvider<ProjectContextRepository> repositoryProvider
  ) {
    this.repositoryProvider = repositoryProvider;
  }

  public ProjectAccessContext loadProjectAccessContext(String projectId) {
    ProjectSummaryDto summary = loadProjectSummary(projectId);

    return new ProjectAccessContext(
        summary.projectId(),
        summary.ownerUserId(),
        summary.departmentId(),
        summary.assignedUserIds(),
        summary.status(),
        summary.archivedAt()
    );
  }

  public ProjectSummaryDto loadProjectSummary(String projectId) {
    String normalizedProjectId = normalizeProjectId(projectId);
    ProjectContextRepository repository = repositoryProvider.getIfAvailable();

    if (repository == null) {
      throw new ServiceUnavailableException(DB_DISABLED_MESSAGE);
    }

    ProjectSummaryDto summary = repository.findProjectSummary(normalizedProjectId)
        .orElseThrow(() -> new NotFoundException("Project not found."));
    List<String> assignedUserIds = repository.findAssignedUserIds(normalizedProjectId);

    return new ProjectSummaryDto(
        summary.projectId(),
        summary.projectName(),
        summary.ownerUserId(),
        summary.departmentId(),
        summary.status(),
        summary.archivedAt(),
        assignedUserIds
    );
  }

  private String normalizeProjectId(String projectId) {
    if (!StringUtils.hasText(projectId)) {
      throw new ValidationException("project_id is required.");
    }

    String normalizedProjectId = projectId.trim();
    if (!NUMERIC_PROJECT_ID.matcher(normalizedProjectId).matches()) {
      throw new ValidationException("project_id must be a numeric string.");
    }

    return normalizedProjectId;
  }
}
