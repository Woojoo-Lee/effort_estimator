package com.company.effort.standardeffort.dto;

public record SolutionDto(
    String solutionCode,
    String solutionName,
    Integer displayOrder,
    boolean active
) {
}
