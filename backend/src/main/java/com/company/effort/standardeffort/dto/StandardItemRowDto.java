package com.company.effort.standardeffort.dto;

public record StandardItemRowDto(
    String itemId,
    Integer excelRowNo,
    String categoryL1,
    String categoryL2,
    String itemName,
    String itemOption,
    Integer displayOrder,
    boolean active
) {
}
