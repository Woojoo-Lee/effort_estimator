package com.company.effort.standardeffort.dto;

import java.util.List;

public record ProjectItemSelectionsResponse(
    List<ProjectItemSelectionDto> projectItemSelections
) {
}
