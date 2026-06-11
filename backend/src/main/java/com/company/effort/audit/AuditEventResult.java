package com.company.effort.audit;

import org.springframework.util.StringUtils;

public final class AuditEventResult {

  public static final String SUCCESS = "success";
  public static final String FAILURE = "failure";

  private AuditEventResult() {
  }

  public static String normalize(String value) {
    if (!StringUtils.hasText(value)) {
      return SUCCESS;
    }

    String normalized = value.trim().toLowerCase();
    if (SUCCESS.equals(normalized) || FAILURE.equals(normalized)) {
      return normalized;
    }

    throw new IllegalArgumentException(
        "event_result must be either success or failure."
    );
  }
}
