package com.company.effort.project.dto;

import java.util.List;

public record ProjectSummaryDto(
    String projectId,
    String projectName,
    String ownerUserId,
    String departmentId,
    String status,
    String archivedAt,
    List<String> assignedUserIds
) {

  public ProjectSummaryDto {
    assignedUserIds = assignedUserIds == null ? List.of() : List.copyOf(assignedUserIds);
  }
}
