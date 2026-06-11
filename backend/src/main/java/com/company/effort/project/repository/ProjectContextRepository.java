package com.company.effort.project.repository;

import com.company.effort.project.dto.ProjectSummaryDto;
import java.util.List;
import java.util.Optional;

public interface ProjectContextRepository {

  Optional<ProjectSummaryDto> findProjectSummary(String projectId);

  List<String> findAssignedUserIds(String projectId);
}
