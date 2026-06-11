package com.company.effort.standardeffort.dto;

public record ProjectItemSelectionDto(
    String projectId,
    String solutionVariantId,
    String itemId,
    boolean checked,
    String createdAt,
    String updatedAt
) {
}
