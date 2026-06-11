package com.company.effort.standardeffort.dto;

import java.math.BigDecimal;

public record CoefficientRowDto(
    String itemId,
    String solutionVariantId,
    BigDecimal coefficient,
    boolean active
) {
}
