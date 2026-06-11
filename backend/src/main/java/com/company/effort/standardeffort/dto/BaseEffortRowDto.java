package com.company.effort.standardeffort.dto;

import java.math.BigDecimal;

public record BaseEffortRowDto(
    String baseEffortId,
    String solutionVariantId,
    String phaseCode,
    String phaseName,
    BigDecimal effortMm,
    Integer displayOrder,
    boolean active
) {
}
