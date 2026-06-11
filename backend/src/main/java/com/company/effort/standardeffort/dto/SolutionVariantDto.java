package com.company.effort.standardeffort.dto;

public record SolutionVariantDto(
    String solutionVariantId,
    String solutionCode,
    String variantCode,
    String variantName,
    String displayName,
    Integer displayOrder,
    boolean active
) {
}
