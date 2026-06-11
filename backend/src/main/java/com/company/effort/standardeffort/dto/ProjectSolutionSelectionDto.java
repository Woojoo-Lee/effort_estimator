package com.company.effort.standardeffort.dto;

import java.math.BigDecimal;

public record ProjectSolutionSelectionDto(
    String projectId,
    String solutionVariantId,
    boolean enabled,
    BigDecimal actualEffortMm,
    String createdAt,
    String updatedAt
) {
}
