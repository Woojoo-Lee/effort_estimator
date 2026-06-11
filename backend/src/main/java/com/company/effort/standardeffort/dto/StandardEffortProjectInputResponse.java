package com.company.effort.standardeffort.dto;

import java.util.List;

public record StandardEffortProjectInputResponse(
    List<SolutionDto> solutions,
    List<SolutionVariantDto> solutionVariants,
    List<BaseEffortRowDto> baseEffortRows,
    List<StandardItemRowDto> itemRows,
    List<CoefficientRowDto> coefficientRows,
    List<ProjectSolutionSelectionDto> projectSolutionSelections,
    List<ProjectItemSelectionDto> projectItemSelections
) {
}
